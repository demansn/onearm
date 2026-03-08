/**
 * @fileoverview Common properties extractor for Figma nodes
 */

import type { AbstractNode } from './types';
import { isMixed } from '../adapters/mixed';
import { NODE_TYPE_MAPPING, shouldExportInstanceSize, cleanNameFromSizeMarker } from './nodeUtils';
import { findComponentType } from '../core/componentRegistry';

/**
 * Extract common properties for all nodes
 */
export function extractCommonProps(node: AbstractNode, isRootLevel: boolean = false, parentBounds: { x: number, y: number } | null = null): any {
  let componentType;

  // Check for special zones (FRAME-specific)
  if (node.name === 'GameZone' && node.type === 'FRAME') {
    componentType = 'GameZone';
  } else if (node.name === 'FullScreenZone' && node.type === 'FRAME') {
    componentType = 'FullScreenZone';
  } else if (node.name === 'SaveZone' && node.type === 'FRAME') {
    componentType = 'SaveZone';
  } else {
    // Check component registry for known types
    const typeDef = node.type !== 'INSTANCE' ? findComponentType(node.name) : null;
    if (typeDef) {
      componentType = typeDef.type;
    } else if (isRootLevel) {
      if ('layoutMode' in node && node.layoutMode && node.layoutMode !== 'NONE') {
        componentType = 'AutoLayout';
      } else {
        componentType = 'SuperContainer';
      }
    } else if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET' || node.type === 'INSTANCE') {
      componentType = 'Component';
    } else if (node.type === 'FRAME') {
      if ('layoutMode' in node && node.layoutMode && node.layoutMode !== 'NONE') {
        componentType = 'AutoLayout';
      } else {
        componentType = 'SuperContainer';
      }
    } else {
      componentType = NODE_TYPE_MAPPING[node.type as keyof typeof NODE_TYPE_MAPPING] || node.type;
    }
  }

  const props: any = {
    name: cleanNameFromSizeMarker(node.name),
    type: componentType
  };

  // Position and size
  if (!isRootLevel) {
    if (parentBounds) {
      // Для детей GROUP пересчитываем координаты относительно группы
      props.x = Math.round(node.x - parentBounds.x);
      props.y = Math.round(node.y - parentBounds.y);
    } else {
      // Для детей FRAME координаты уже относительные
      props.x = Math.round(node.x);
      props.y = Math.round(node.y);
    }
  }

  // Check if this object is marked for size export
  const isMarkedForSize = shouldExportInstanceSize(node.name);

  // Size property only for AutoLayout (FRAME with AutoLayout type)
  if (node.type === 'FRAME' && componentType === 'AutoLayout') {
    props.size = {};

    if ('layoutSizingHorizontal' in node && node.layoutSizingHorizontal !== 'HUG') {
      props.size.width = Math.round(node.width);
    }
    if ('layoutSizingVertical' in node && node.layoutSizingVertical !== 'HUG') {
      props.size.height = Math.round(node.height);
    }
  } else if (isMarkedForSize || node.type === 'RECTANGLE') {
    // Width/height for marked objects (including Button) or Rectangle components
    props.width = Math.round(node.width);
    props.height = Math.round(node.height);
  }

  // Visibility - export if explicitly set to false (hidden in Figma)
  if (node.visible !== undefined && node.visible === false) {
    props.visible = false;
  }

  // Opacity - only export if not 1
  if ('opacity' in node && node.opacity !== undefined && !isMixed(node.opacity) && node.opacity !== 1) {
    props.alpha = node.opacity;
  }

  // Rotation: Figma REST API returns radians; convert to degrees for engine (object.angle)
  if ('rotation' in node && node.rotation !== undefined && !isMixed(node.rotation) && node.rotation !== 0) {
    props.angle = Math.round(node.rotation * (180 / Math.PI) * 10) / 10;

    // Figma reports x,y as AABB top-left and rotates around the object center.
    // PIXI rotates around pivot (0,0) by default, so we need the relativeTransform tx,ty —
    // the position of the local origin in parent space — not the AABB top-left.
    // Formula: tx = cx - cos(θ)*origW/2 + sin(θ)*origH/2
    //          ty = cy - sin(θ)*origW/2 - cos(θ)*origH/2
    // where cx,cy = AABB center, origW/origH = unrotated dimensions.
    if (!isRootLevel) {
      const θ = node.rotation as number;
      const cosθ = Math.cos(θ);
      const sinθ = Math.sin(θ);
      // At 90°/270° the AABB has swapped dimensions vs the original object
      const isSwapped = Math.abs(sinθ) > 0.707;
      const aabbW = node.width;
      const aabbH = node.height;
      const origW = isSwapped ? aabbH : aabbW;
      const origH = isSwapped ? aabbW : aabbH;
      const cx = props.x + aabbW / 2;
      const cy = props.y + aabbH / 2;
      props.x = Math.round(cx - cosθ * origW / 2 + sinθ * origH / 2);
      props.y = Math.round(cy - sinθ * origW / 2 - cosθ * origH / 2);
    }
  }

  // Scale functionality removed - use width/height instead

  return props;
}
