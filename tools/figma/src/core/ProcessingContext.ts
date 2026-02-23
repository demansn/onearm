import type { AbstractNode } from '../adapters/types';
import { isSpecialZone } from './constants';
import { Bounds, ProcessingContext, ZoneContext } from './types';

/**
 * @param {Map<string, any>} componentMap
 * @returns {ProcessingContext}
 */
export function createRootContext(componentMap: Map<string, any>): ProcessingContext {
  return {
    componentMap,
    parentBounds: null,
    isRootLevel: true,
    parentZoneInfo: null,
    diagnostics: []
  };
}

/**
 * @param {ProcessingContext} context
 * @param {Partial<ProcessingContext>} patch
 * @returns {ProcessingContext}
 */
export function withContext(context: ProcessingContext, patch: Partial<ProcessingContext>): ProcessingContext {
  return {
    componentMap: patch.componentMap || context.componentMap,
    parentBounds: patch.parentBounds === undefined ? context.parentBounds : patch.parentBounds,
    isRootLevel: patch.isRootLevel === undefined ? context.isRootLevel : patch.isRootLevel,
    parentZoneInfo: patch.parentZoneInfo === undefined ? context.parentZoneInfo : patch.parentZoneInfo,
    diagnostics: patch.diagnostics || context.diagnostics
  };
}

/**
 * @param {AbstractNode} node
 * @returns {Bounds | null}
 */
export function getContainerBounds(node: AbstractNode): Bounds | null {
  if (node.type === 'GROUP') {
    return { x: node.x, y: node.y };
  }
  return null;
}

/**
 * @param {string} type
 * @param {AbstractNode} node
 * @returns {ZoneContext | null}
 */
export function getDirectZoneContext(type: string, node: AbstractNode): ZoneContext | null {
  if (node.type === 'FRAME' && isSpecialZone(type)) {
    return { type, zoneNode: node };
  }
  return null;
}
