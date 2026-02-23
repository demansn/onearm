/**
 * @fileoverview Common properties extractor for Figma nodes
 */

import type { AbstractNode } from './types';
import { isMixed } from '../adapters/mixed';
import { NODE_TYPE_MAPPING, shouldExportInstanceSize, cleanNameFromSizeMarker, isVariantsContainer, isDotsGroup, isReelsLayout, isScrollBox } from './nodeUtils';

/**
 * Extract common properties for all nodes
 */
export function extractCommonProps(node: AbstractNode, isRootLevel: boolean = false, parentBounds: { x: number, y: number } | null = null): any {
  let componentType;

  // Check for special component types
  if (node.name === 'GameZone' && node.type === 'FRAME') {
    componentType = 'GameZone';
  } else if (node.name === 'FullScreenZone' && node.type === 'FRAME') {
    componentType = 'FullScreenZone';
  } else if (node.name === 'SaveZone' && node.type === 'FRAME') {
    componentType = 'SaveZone';
  } else if (isVariantsContainer(node.name) && node.type !== 'INSTANCE') {
    componentType = 'VariantsContainer';
  } else if (isDotsGroup(node.name) && node.type !== 'INSTANCE') {
    componentType = 'DotsGroup';
  } else if (isReelsLayout(node.name) && node.type !== 'INSTANCE') {
    componentType = 'ReelsLayout';
  } else if (cleanNameFromSizeMarker(node.name).endsWith('Toggle') && node.type !== 'INSTANCE') {
    componentType = 'CheckBoxComponent';
  } else if (cleanNameFromSizeMarker(node.name).endsWith('ValueSlider') && node.type !== 'INSTANCE') {
    componentType = 'ValueSlider';
  } else if (isScrollBox(node.name) && node.type !== 'INSTANCE') {
    componentType = 'ScrollBox';
  } else if (cleanNameFromSizeMarker(node.name).endsWith('Button') && node.type !== 'INSTANCE') {
    componentType = 'Button';
  } else if (cleanNameFromSizeMarker(node.name).endsWith('TextBlock') && node.type === 'TEXT') {
    componentType = 'TextBlock';
  } else if (isRootLevel) {
    componentType = 'ComponentContainer';
  } else if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET' || node.type === 'INSTANCE') {
    componentType = 'Component';
  } else if (node.type === 'FRAME') {
    // Determine Frame type based on layoutMode
    if ('layoutMode' in node && node.layoutMode && node.layoutMode !== 'NONE') {
      componentType = 'AutoLayout';
    } else {
      componentType = 'SuperContainer';
    }
  } else {
    componentType = NODE_TYPE_MAPPING[node.type as keyof typeof NODE_TYPE_MAPPING] || node.type;
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

  // Rotation
  if ('rotation' in node && node.rotation !== undefined && !isMixed(node.rotation) && node.rotation !== 0) {
    props.rotation = node.rotation;
  }

  // Scale functionality removed - use width/height instead

  return props;
}
