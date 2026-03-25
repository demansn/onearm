/**
 * @fileoverview Converts Figma REST API JSON node → AbstractNode
 */

import type { AbstractNode, UnifiedConstraints, UnifiedFontName, UnifiedLineHeight, UnifiedPaint } from '../types';

/**
 * Converts REST API node object to AbstractNode.
 * Handles coordinate conversion from absolute to relative.
 */
export class RestNodeAdapter implements AbstractNode {
  private readonly data: any;
  private readonly parentAbsX: number;
  private readonly parentAbsY: number;
  private _children?: readonly AbstractNode[];

  constructor(data: any, parentAbsX: number = 0, parentAbsY: number = 0) {
    this.data = data;
    this.parentAbsX = parentAbsX;
    this.parentAbsY = parentAbsY;
  }

  get id(): string { return this.data.id || ''; }
  get type(): string { return this.data.type || ''; }
  get name(): string { return this.data.name || ''; }

  // Convert absolute to relative coordinates
  get x(): number {
    const bbox = this.data.absoluteBoundingBox;
    return bbox ? Math.round(bbox.x - this.parentAbsX) : 0;
  }

  get y(): number {
    const bbox = this.data.absoluteBoundingBox;
    return bbox ? Math.round(bbox.y - this.parentAbsY) : 0;
  }

  get width(): number {
    return this.data.absoluteBoundingBox ? this.data.absoluteBoundingBox.width : 0;
  }

  get height(): number {
    return this.data.absoluteBoundingBox ? this.data.absoluteBoundingBox.height : 0;
  }

  get visible(): boolean {
    return this.data.visible !== false;
  }

  get opacity(): number {
    return this.data.opacity !== undefined ? this.data.opacity : 1;
  }

  get rotation(): number {
    return this.data.rotation || 0;
  }

  // Layout properties
  get layoutMode(): string | undefined {
    return this.data.layoutMode;
  }

  get itemSpacing(): number | undefined {
    return this.data.itemSpacing;
  }

  get counterAxisSpacing(): number | undefined {
    return this.data.counterAxisSpacing;
  }

  get layoutSizingHorizontal(): string | undefined {
    return this.data.primaryAxisSizingMode === 'AUTO' ? 'HUG' :
           this.data.primaryAxisSizingMode === 'FIXED' ? 'FIXED' :
           this.data.layoutSizingHorizontal;
  }

  get layoutSizingVertical(): string | undefined {
    return this.data.counterAxisSizingMode === 'AUTO' ? 'HUG' :
           this.data.counterAxisSizingMode === 'FIXED' ? 'FIXED' :
           this.data.layoutSizingVertical;
  }

  get primaryAxisAlignItems(): string | undefined {
    return this.data.primaryAxisAlignItems;
  }

  get counterAxisAlignItems(): string | undefined {
    return this.data.counterAxisAlignItems;
  }

  get layoutGrids(): any[] | undefined {
    return this.data.layoutGrids;
  }

  get clipsContent(): boolean | undefined {
    return this.data.clipsContent;
  }

  // Constraints
  get constraints(): UnifiedConstraints | undefined {
    if (!this.data.constraints) return undefined;
    // REST API uses same constraint names but different values for horizontal:
    // LEFT→MIN, RIGHT→MAX, LEFT_RIGHT→STRETCH
    const h = this.data.constraints.horizontal;
    const v = this.data.constraints.vertical;

    const hMap: Record<string, string> = {
      'LEFT': 'MIN', 'RIGHT': 'MAX', 'CENTER': 'CENTER',
      'LEFT_RIGHT': 'STRETCH', 'SCALE': 'SCALE',
      // Plugin API values pass through
      'MIN': 'MIN', 'MAX': 'MAX', 'STRETCH': 'STRETCH'
    };
    const vMap: Record<string, string> = {
      'TOP': 'MIN', 'BOTTOM': 'MAX', 'CENTER': 'CENTER',
      'TOP_BOTTOM': 'STRETCH', 'SCALE': 'SCALE',
      'MIN': 'MIN', 'MAX': 'MAX', 'STRETCH': 'STRETCH'
    };

    return {
      horizontal: (hMap[h] || 'MIN') as UnifiedConstraints['horizontal'],
      vertical: (vMap[v] || 'MIN') as UnifiedConstraints['vertical']
    };
  }

  // Visual properties (REST API returns arrays, never mixed)
  get fills(): readonly UnifiedPaint[] {
    return this.data.fills || [];
  }

  get strokes(): readonly UnifiedPaint[] {
    return this.data.strokes || [];
  }

  get strokeWeight(): number {
    return this.data.strokeWeight || 0;
  }

  get cornerRadius(): number {
    return this.data.cornerRadius || 0;
  }

  get topLeftRadius(): number | undefined {
    return this.data.rectangleCornerRadii ? this.data.rectangleCornerRadii[0] : undefined;
  }

  get topRightRadius(): number | undefined {
    return this.data.rectangleCornerRadii ? this.data.rectangleCornerRadii[1] : undefined;
  }

  get bottomRightRadius(): number | undefined {
    return this.data.rectangleCornerRadii ? this.data.rectangleCornerRadii[2] : undefined;
  }

  get bottomLeftRadius(): number | undefined {
    return this.data.rectangleCornerRadii ? this.data.rectangleCornerRadii[3] : undefined;
  }

  // Text properties (from style object in REST API)
  get characters(): string | undefined {
    return this.data.characters;
  }

  get fontName(): UnifiedFontName | undefined {
    if (this.data.type !== 'TEXT') return undefined;
    const style = this.data.style;
    if (!style) return undefined;
    return {
      family: style.fontFamily || '',
      style: style.fontPostScriptName || style.fontStyle || ''
    };
  }

  get fontSize(): number | undefined {
    if (this.data.type !== 'TEXT') return undefined;
    return this.data.style ? this.data.style.fontSize : undefined;
  }

  get fontWeight(): number | undefined {
    if (this.data.type !== 'TEXT') return undefined;
    return this.data.style ? this.data.style.fontWeight : undefined;
  }

  get lineHeight(): UnifiedLineHeight | undefined {
    if (this.data.type !== 'TEXT' || !this.data.style) return undefined;
    const style = this.data.style;

    if (style.lineHeightPx !== undefined && style.lineHeightPercentFontSize !== undefined) {
      // Use pixels if available
      return { unit: 'PIXELS', value: style.lineHeightPx };
    }
    if (style.lineHeightUnit === 'FONT_SIZE_%') {
      return { unit: 'PERCENT', value: style.lineHeightPercentFontSize || 100 };
    }
    if (style.lineHeightUnit === 'INTRINSIC_%') {
      return { unit: 'AUTO', value: 0 };
    }
    return undefined;
  }

  get textAlignHorizontal(): string | undefined {
    if (this.data.type !== 'TEXT' || !this.data.style) return undefined;
    return this.data.style.textAlignHorizontal;
  }

  get textAutoResize(): string | undefined {
    if (this.data.type !== 'TEXT') return undefined;
    // REST API omits textAutoResize when value is NONE (Fixed Size)
    return this.data.style?.textAutoResize ?? 'NONE';
  }

  // Component properties
  get mainComponentId(): string | undefined {
    return this.data.componentId;
  }

  get componentProperties(): Record<string, any> | undefined {
    return this.data.componentProperties;
  }

  get variantProperties(): Record<string, string> | null {
    // REST API doesn't have variantProperties directly on the node
    // For COMPONENT inside COMPONENT_SET, parse from name
    if (this.data.type === 'COMPONENT' && this.data.name && this.data.name.includes('=')) {
      const result: Record<string, string> = {};
      const pairs = this.data.name.split(',').map((s: string) => s.trim());
      pairs.forEach((pair: string) => {
        const [key, value] = pair.split('=').map((s: string) => s.trim());
        if (key && value) {
          result[key] = value;
        }
      });
      return Object.keys(result).length > 0 ? result : null;
    }
    return null;
  }

  get componentPropertyDefinitions(): Record<string, any> | undefined {
    return this.data.componentPropertyDefinitions;
  }

  get parentType(): string | undefined {
    return undefined; // REST API has no parent reference
  }

  // Tree
  get children(): readonly AbstractNode[] {
    if (this._children === undefined) {
      const myAbsX = this.data.absoluteBoundingBox ? this.data.absoluteBoundingBox.x : 0;
      const myAbsY = this.data.absoluteBoundingBox ? this.data.absoluteBoundingBox.y : 0;
      this._children = (this.data.children || []).map(
        (c: any) => new RestNodeAdapter(c, myAbsX, myAbsY)
      );
    }
    return this._children ?? [];
  }
}
