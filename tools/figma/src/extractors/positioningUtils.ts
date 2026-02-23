/**
 * @fileoverview Positioning and alignment utilities for Figma nodes
 */

import type { AbstractNode } from './types';

/**
 * Calculate text anchor and adjusted coordinates based on constraints
 * For TextBlock components, returns alignItems instead of anchorX/anchorY
 */
export function calculateTextPositioning(node: AbstractNode, isTextBlock: boolean = false): any {
  if (node.type !== 'TEXT' || !('constraints' in node) || !node.constraints) {
    return {};
  }

  const result: any = {};

  if (isTextBlock) {
    // For TextBlock: use alignItems instead of anchorX/anchorY
    const alignItems: any = {};

    // Calculate horizontal alignment
    if (node.constraints.horizontal) {
      switch (node.constraints.horizontal) {
        case 'MIN':
          alignItems.x = 'left';
          break;
        case 'CENTER':
          alignItems.x = 'center';
          break;
        case 'MAX':
          alignItems.x = 'right';
          break;
        case 'STRETCH':
          alignItems.x = 'left'; // Default to left for stretch
          break;
        case 'SCALE':
          alignItems.x = 'center'; // Center for scale
          break;
        default:
          alignItems.x = 'left';
      }
    } else {
      alignItems.x = 'left';
    }

    // Calculate vertical alignment
    if (node.constraints.vertical) {
      switch (node.constraints.vertical) {
        case 'MIN':
          alignItems.y = 'top';
          break;
        case 'CENTER':
          alignItems.y = 'center';
          break;
        case 'MAX':
          alignItems.y = 'bottom';
          break;
        case 'STRETCH':
          alignItems.y = 'top'; // Default to top for stretch
          break;
        case 'SCALE':
          alignItems.y = 'center'; // Center for scale
          break;
        default:
          alignItems.y = 'top';
      }
    } else {
      alignItems.y = 'top';
    }

    result.alignItems = alignItems;
  } else {
    // For regular Text: use anchorX/anchorY (existing logic)
    // Calculate anchor based on horizontal constraint
    if (node.constraints.horizontal) {
      switch (node.constraints.horizontal) {
        case 'MIN':
          result.anchorX = 0; // Left edge
          break;
        case 'CENTER':
          result.anchorX = 0.5; // Center
          break;
        case 'MAX':
          result.anchorX = 1; // Right edge
          break;
        case 'STRETCH':
          result.anchorX = 0; // Default to left for stretch
          break;
        case 'SCALE':
          result.anchorX = 0.5; // Center for scale
          break;
        default:
          result.anchorX = 0;
      }
    }

    // Calculate anchor based on vertical constraint
    if (node.constraints.vertical) {
      switch (node.constraints.vertical) {
        case 'MIN':
          result.anchorY = 0; // Top edge
          break;
        case 'CENTER':
          result.anchorY = 0.5; // Center
          break;
        case 'MAX':
          result.anchorY = 1; // Bottom edge
          break;
        case 'STRETCH':
          result.anchorY = 0; // Default to top for stretch
          break;
        case 'SCALE':
          result.anchorY = 0.5; // Center for scale
          break;
        default:
          result.anchorY = 0;
      }
    }

    // Adjust coordinates based on anchor point (use relative coordinates)
    if (result.anchorX !== undefined || result.anchorY !== undefined) {
      const relativeX = node.x;
      const relativeY = node.y;

      if (result.anchorX !== undefined) {
        if (result.anchorX === 0.5) {
          result.adjustedX = Math.round(relativeX + node.width / 2);
        } else if (result.anchorX === 1) {
          result.adjustedX = Math.round(relativeX + node.width);
        } else {
          result.adjustedX = Math.round(relativeX);
        }
      }

      if (result.anchorY !== undefined) {
        if (result.anchorY === 0.5) {
          result.adjustedY = Math.round(relativeY + node.height / 2);
        } else if (result.anchorY === 1) {
          result.adjustedY = Math.round(relativeY + node.height);
        } else {
          result.adjustedY = Math.round(relativeY);
        }
      }
    }
  }

  return result;
}

/**
 * Extract positioning properties for special zone children based on constraints
 * Works for GameZone, FullScreenZone, and SaveZone
 * All objects are positioned from their center
 */
export function extractZoneChildProps(node: AbstractNode, zoneNode: AbstractNode): any {
  const props: any = {};

  if (!('constraints' in node) || !node.constraints) {
    return props;
  }

  const constraints = node.constraints;
  const align: any = {};
  const offset: any = {};

  // Calculate offsets from Zone edges (to object edges, not center)
  const nodeLeft = node.x;
  const nodeTop = node.y;
  const nodeRight = node.x + node.width;
  const nodeBottom = node.y + node.height;

  // Also calculate center coordinates for center constraints
  const nodeCenterX = node.x + node.width / 2;
  const nodeCenterY = node.y + node.height / 2;

  // Horizontal alignment
  switch (constraints.horizontal) {
    case 'MIN': // Left
      align.x = 'left';
      // Distance from left edge of zone to left edge of object
      offset.left = Math.round(nodeLeft);
      break;
    case 'MAX': // Right
      align.x = 'right';
      // Distance from right edge of zone to right edge of object
      offset.right = Math.round(zoneNode.width - nodeRight);
      break;
    case 'STRETCH': // Left + Right - use percentage from left edge
      // This happens when both left and right constraints are set
      if (constraints.horizontal === 'STRETCH') {
        // Check if this is actually left+right constraint by checking constraints object
        align.x = 'absolute';
        // Use left edge position as percentage
        const leftPercent = (nodeLeft / zoneNode.width) * 100;
        offset.x = `${leftPercent.toFixed(1)}%`;
      }
      break;
    case 'CENTER': // Center
      align.x = 'center';
      // Offset from zone center to object center
      const zoneCenterX = zoneNode.width / 2;
      offset.centerX = Math.round(nodeCenterX - zoneCenterX);
      break;
    case 'SCALE': // Scale - absolute positioning
      align.x = 'absolute';
      break;
    default:
      // No constraint or other types - default to left
      align.x = 'left';
      if (!offset.hasOwnProperty('left')) {
        // Distance from left edge of zone to left edge of object
        offset.left = Math.round(nodeLeft);
      }
  }

  // Vertical alignment
  switch (constraints.vertical) {
    case 'MIN': // Top
      align.y = 'top';
      // Distance from top edge of zone to top edge of object
      offset.top = Math.round(nodeTop);
      break;
    case 'MAX': // Bottom
      align.y = 'bottom';
      // Distance from bottom edge of zone to bottom edge of object
      offset.bottom = Math.round(zoneNode.height - nodeBottom);
      break;
    case 'STRETCH': // Top + Bottom - use percentage from top edge
      // This happens when both top and bottom constraints are set
      if (constraints.vertical === 'STRETCH') {
        align.y = 'absolute';
        // Use top edge position as percentage
        const topPercent = (nodeTop / zoneNode.height) * 100;
        offset.y = `${topPercent.toFixed(1)}%`;
      }
      break;
    case 'CENTER': // Center
      align.y = 'center';
      // Offset from zone center to object center
      const zoneCenterY = zoneNode.height / 2;
      offset.centerY = Math.round(nodeCenterY - zoneCenterY);
      break;
    case 'SCALE': // Scale - absolute positioning
      align.y = 'absolute';
      break;
    default:
      // No constraint or other types - default to top
      align.y = 'top';
      if (!offset.hasOwnProperty('top')) {
        // Distance from top edge of zone to top edge of object
        offset.top = Math.round(nodeTop);
      }
  }

  // For SCALE constraints only, set offset as position of top-left corner
  if (align.x === 'absolute' && align.y === 'absolute' &&
      constraints.horizontal === 'SCALE' && constraints.vertical === 'SCALE') {
    offset.x = Math.round(nodeLeft);
    offset.y = Math.round(nodeTop);
  } else if (align.x === 'absolute' && constraints.horizontal === 'SCALE') {
    offset.x = Math.round(nodeLeft);
  } else if (align.y === 'absolute' && constraints.vertical === 'SCALE') {
    offset.y = Math.round(nodeTop);
  }

  // Always add align (required for special zones)
  props.align = align;

  // Add offset only if it has properties
  if (Object.keys(offset).length > 0) {
    props.offset = offset;
  }

  return props;
}
