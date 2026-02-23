/**
 * @fileoverview Corner radius properties extractor for Figma nodes
 */

import type { AbstractNode } from './types';
import { isMixed } from '../adapters/mixed';

/**
 * Extract corner radius properties
 */
export function extractCornerProps(node: AbstractNode): any {
  const props: any = {};

  // For Rectangle, use 'radius' property instead of 'cornerRadius'
  const radiusProperty = node.type === 'RECTANGLE' ? 'radius' : 'cornerRadius';

  if ('cornerRadius' in node && node.cornerRadius !== undefined &&
      !isMixed(node.cornerRadius) &&
      typeof node.cornerRadius === 'number' && node.cornerRadius > 0) {
    props[radiusProperty] = node.cornerRadius;
  }

  if ('topLeftRadius' in node) {
    // Check if all corners have radius > 0
    const hasRadius = (node.topLeftRadius ?? 0) > 0 || (node.topRightRadius ?? 0) > 0 ||
                     (node.bottomRightRadius ?? 0) > 0 || (node.bottomLeftRadius ?? 0) > 0;

    if (hasRadius) {
      // Check if all corners have the same radius value
      const allSame = node.topLeftRadius === node.topRightRadius &&
                     node.topRightRadius === node.bottomRightRadius &&
                     node.bottomRightRadius === node.bottomLeftRadius;

      if (allSame) {
        // All corners are the same - export single value
        props[radiusProperty] = node.topLeftRadius;
      } else {
        // Different corner values - export object
        props[radiusProperty] = {
          topLeft: node.topLeftRadius,
          topRight: node.topRightRadius,
          bottomRight: node.bottomRightRadius,
          bottomLeft: node.bottomLeftRadius
        };
      }
    }
  }

  return props;
}
