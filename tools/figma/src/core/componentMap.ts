import type { AbstractNode, ComponentMapEntry } from '../adapters/types';

/**
 * @param {AbstractNode} node
 * @param {Map<string, ComponentMapEntry>} componentMap
 * @param {boolean} parentIsComponentSet
 * @returns {Map<string, ComponentMapEntry>}
 */
export function buildComponentMap(
  node: AbstractNode,
  componentMap: Map<string, ComponentMapEntry> = new Map(),
  parentIsComponentSet: boolean = false
): Map<string, ComponentMapEntry> {
  if ((node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') && node.id && node.name && !parentIsComponentSet) {
    componentMap.set(node.id, {
      name: node.name,
      width: node.width,
      height: node.height,
      node: node
    });
  }

  if (node.type === 'COMPONENT_SET' && node.children) {
    node.children.forEach(variant => {
      if (variant.type === 'COMPONENT' && variant.id) {
        componentMap.set(variant.id, {
          name: node.name,
          width: variant.width,
          height: variant.height,
          node: variant
        });
      }
    });
  }

  if (node.children) {
    const isComponentSet = node.type === 'COMPONENT_SET';
    node.children.forEach(child => buildComponentMap(child, componentMap, isComponentSet));
  }

  return componentMap;
}
