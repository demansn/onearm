/**
 * @fileoverview DocumentProvider wrapping Figma REST API response
 */

import type { AbstractNode, ComponentMapEntry, DocumentProvider } from '../types';
import { RestNodeAdapter } from './RestNodeAdapter';

export class RestDocumentProvider implements DocumentProvider {
  private readonly fileData: any;

  /**
   * @param fileData Parsed response from GET /v1/files/:key
   */
  constructor(fileData: any) {
    this.fileData = fileData;
  }

  getPages(): AbstractNode[] {
    if (!this.fileData.document || !this.fileData.document.children) return [];
    return this.fileData.document.children.map(
      (page: any) => new RestNodeAdapter(page)
    );
  }

  findPageByName(name: string): AbstractNode | undefined {
    if (!this.fileData.document || !this.fileData.document.children) return undefined;
    const page = this.fileData.document.children.find((p: any) => p.name === name);
    return page ? new RestNodeAdapter(page) : undefined;
  }

  buildComponentMap(): Map<string, ComponentMapEntry> {
    const map = new Map<string, ComponentMapEntry>();

    // Use the top-level components metadata from REST API response
    const components = this.fileData.components || {};
    Object.entries(components).forEach(([id, meta]: [string, any]) => {
      map.set(id, {
        name: meta.name,
        width: 0,
        height: 0
      });
    });

    // Traverse tree to get accurate sizes and node references
    if (this.fileData.document) {
      this.traverseForComponents(this.fileData.document, map, 0, 0);
    }

    return map;
  }

  private traverseForComponents(
    nodeData: any,
    map: Map<string, ComponentMapEntry>,
    parentAbsX: number,
    parentAbsY: number,
    parentIsComponentSet: boolean = false
  ): void {
    const absX = nodeData.absoluteBoundingBox ? nodeData.absoluteBoundingBox.x : 0;
    const absY = nodeData.absoluteBoundingBox ? nodeData.absoluteBoundingBox.y : 0;

    if ((nodeData.type === 'COMPONENT' || nodeData.type === 'COMPONENT_SET') && nodeData.id && nodeData.name && !parentIsComponentSet) {
      const node = new RestNodeAdapter(nodeData, parentAbsX, parentAbsY);
      map.set(nodeData.id, {
        name: nodeData.name,
        width: nodeData.absoluteBoundingBox ? nodeData.absoluteBoundingBox.width : 0,
        height: nodeData.absoluteBoundingBox ? nodeData.absoluteBoundingBox.height : 0,
        node
      });
    }

    if (nodeData.type === 'COMPONENT_SET' && nodeData.children) {
      nodeData.children.forEach((variant: any) => {
        if (variant.type === 'COMPONENT' && variant.id) {
          const variantNode = new RestNodeAdapter(variant, absX, absY);
          map.set(variant.id, {
            name: nodeData.name,
            width: variant.absoluteBoundingBox ? variant.absoluteBoundingBox.width : 0,
            height: variant.absoluteBoundingBox ? variant.absoluteBoundingBox.height : 0,
            node: variantNode
          });
        }
      });
    }

    if (nodeData.children) {
      const isComponentSet = nodeData.type === 'COMPONENT_SET';
      nodeData.children.forEach((child: any) => {
        this.traverseForComponents(child, map, absX, absY, isComponentSet);
      });
    }
  }
}
