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
 * Returns unrotated (original) dimensions of a node.
 * At 90°/270°, absoluteBoundingBox swaps width/height vs the original object.
 */
export function getUnrotatedDimensions(node: AbstractNode): { origW: number; origH: number } {
  const rotation = typeof node.rotation === 'number' ? node.rotation : 0;
  const isSwapped = Math.abs(Math.sin(rotation)) > 0.707;
  return {
    origW: isSwapped ? node.height : node.width,
    origH: isSwapped ? node.width : node.height,
  };
}

/**
 * Correct AABB-based x,y to PIXI local origin position (relativeTransform tx,ty).
 *
 * Figma reports x,y as AABB top-left and rotates around the object center.
 * PIXI rotates around pivot (0,0) by default, so x,y must be the local origin
 * in parent space. Formula:
 *   tx = cx - cos(θ)*origW/2 + sin(θ)*origH/2
 *   ty = cy - sin(θ)*origW/2 - cos(θ)*origH/2
 * where cx,cy = AABB center, origW/H = unrotated object dimensions.
 */
export function correctRotatedPosition(
  x: number,
  y: number,
  node: AbstractNode
): { x: number; y: number } {
  const rotation = typeof node.rotation === 'number' ? node.rotation : 0;
  if (rotation === 0) return { x, y };

  const cosθ = Math.cos(rotation);
  const sinθ = Math.sin(rotation);
  const { origW, origH } = getUnrotatedDimensions(node);
  const cx = x + node.width / 2;
  const cy = y + node.height / 2;
  return {
    x: Math.round(cx - cosθ * origW / 2 + sinθ * origH / 2),
    y: Math.round(cy - sinθ * origW / 2 - cosθ * origH / 2),
  };
}

/**
 * Apply relative position to a config object based on parent bounds.
 * Sets x and y on the target object, with rotation correction for PIXI.
 */
export function applyRelativePosition(
  target: any,
  node: AbstractNode,
  parentBounds: Bounds | null
): void {
  const baseX = parentBounds ? Math.round(node.x - parentBounds.x) : Math.round(node.x);
  const baseY = parentBounds ? Math.round(node.y - parentBounds.y) : Math.round(node.y);
  const corrected = correctRotatedPosition(baseX, baseY, node);
  target.x = corrected.x;
  target.y = corrected.y;
}
