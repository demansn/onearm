/**
 * @fileoverview AutoLayout properties extractor for Figma nodes
 */

import type { AbstractNode } from './types';

/**
 * Extract layout properties from AutoLayout nodes
 */
export function extractAutoLayoutProps(node: AbstractNode): any {
  if (node.type !== 'FRAME' || !node.layoutMode) {
    return {};
  }

  const props: any = {
    flow: node.layoutMode.toLowerCase(), // VERTICAL, HORIZONTAL
  };

  if (node.itemSpacing !== undefined) {
    props.gap = node.itemSpacing;
  }

  // Check for space-between distribution
  if (node.primaryAxisAlignItems === 'SPACE_BETWEEN') {
    props.spaceBetween = true;
  }

  // Map Figma alignment values to expected values
  const alignmentMap: { [key: string]: string } = {
    'MIN': 'left',
    'CENTER': 'center',
    'MAX': 'right',
    'SPACE_BETWEEN': 'space-between',
    'SPACE_AROUND': 'space-around',
    'SPACE_EVENLY': 'space-evenly'
  };

  const verticalAlignmentMap: { [key: string]: string } = {
    'MIN': 'top',
    'CENTER': 'center',
    'MAX': 'bottom',
    'SPACE_BETWEEN': 'space-between',
    'SPACE_AROUND': 'space-around',
    'SPACE_EVENLY': 'space-evenly'
  };

  props.contentAlign = {
    x: 'left',
    y: 'top',
  };

  if (node.primaryAxisAlignItems) {
    // For horizontal layout, primary axis is X
    // For vertical layout, primary axis is Y
    if (node.layoutMode === 'HORIZONTAL') {
      props.contentAlign.x = alignmentMap[node.primaryAxisAlignItems] || 'left';
    } else {
      props.contentAlign.y = verticalAlignmentMap[node.primaryAxisAlignItems] || 'top';
    }
  }

  if (node.counterAxisAlignItems) {
    // For horizontal layout, counter axis is Y
    // For vertical layout, counter axis is X
    if (node.layoutMode === 'HORIZONTAL') {
      props.contentAlign.y = verticalAlignmentMap[node.counterAxisAlignItems] || 'top';
    } else {
      props.contentAlign.x = alignmentMap[node.counterAxisAlignItems] || 'left';
    }
  }

  return props;
}
