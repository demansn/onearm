import type { AbstractNode } from '../adapters/types';
import { Bounds } from './types';

/**
 * Calculate coordinate relative to parent bounds.
 * For GROUP children, subtracts parent offset.
 * For FRAME children, coordinates are already relative.
 */
export function relativeCoord(value: number, parentBounds: Bounds | null): number {
  if (parentBounds) {
    return Math.round(value - parentBounds.x);
  }
  return Math.round(value);
}

/**
 * Apply relative position to a config object based on parent bounds.
 * Sets x and y on the target object.
 */
export function applyRelativePosition(
  target: any,
  node: AbstractNode,
  parentBounds: Bounds | null
): void {
  if (parentBounds) {
    target.x = Math.round(node.x - parentBounds.x);
    target.y = Math.round(node.y - parentBounds.y);
  } else {
    target.x = Math.round(node.x);
    target.y = Math.round(node.y);
  }
}
