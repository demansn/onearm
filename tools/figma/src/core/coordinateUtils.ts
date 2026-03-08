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
 *
 * For rotated nodes, absoluteBoundingBox gives the axis-aligned bounding box top-left.
 * PIXI rotates around pivot (0,0) by default, so x,y must be the local origin position
 * in parent space (relativeTransform tx,ty). We compute this from AABB + rotation angle:
 *   tx = cx - cos(θ)*origW/2 + sin(θ)*origH/2
 *   ty = cy - sin(θ)*origW/2 - cos(θ)*origH/2
 * where cx,cy = AABB center, origW/H = unrotated object dimensions.
 */
export function applyRelativePosition(
  target: any,
  node: AbstractNode,
  parentBounds: Bounds | null
): void {
  // Base x,y from AABB (relative to parent)
  let baseX = parentBounds ? Math.round(node.x - parentBounds.x) : Math.round(node.x);
  let baseY = parentBounds ? Math.round(node.y - parentBounds.y) : Math.round(node.y);

  const rotation = typeof node.rotation === 'number' ? node.rotation : 0;
  if (rotation !== 0) {
    const cosθ = Math.cos(rotation);
    const sinθ = Math.sin(rotation);
    const isSwapped = Math.abs(sinθ) > 0.707;
    const aabbW = node.width;
    const aabbH = node.height;
    const origW = isSwapped ? aabbH : aabbW;
    const origH = isSwapped ? aabbW : aabbH;
    const cx = baseX + aabbW / 2;
    const cy = baseY + aabbH / 2;
    baseX = Math.round(cx - cosθ * origW / 2 + sinθ * origH / 2);
    baseY = Math.round(cy - sinθ * origW / 2 - cosθ * origH / 2);
  }

  target.x = baseX;
  target.y = baseY;
}
