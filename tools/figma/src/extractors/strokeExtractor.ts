/**
 * @fileoverview Stroke properties extractor for Figma nodes
 */

import type { AbstractNode, Paint } from './types';
import { isMixed } from '../adapters/mixed';
import { colorToHex } from './colorUtils';

/**
 * Extract stroke properties from node
 */
export function extractStrokeProps(node: AbstractNode): any {
  const props: any = {};

  // Find first visible stroke
  if ('strokes' in node && node.strokes && !isMixed(node.strokes) && node.strokes.length > 0) {
    const stroke = (node.strokes as readonly Paint[]).find(s => s.visible !== false);
    if (stroke) {
      // Handle solid strokes
      if (stroke.type === 'SOLID') {
        props.stroke = colorToHex(stroke.color!);
      }
      // Handle gradient strokes (for Text only)
      else if (node.type === 'TEXT' &&
               (stroke.type === 'GRADIENT_LINEAR' || stroke.type === 'GRADIENT_RADIAL' || stroke.type === 'GRADIENT_ANGULAR') &&
               stroke.gradientStops && stroke.gradientStops.length > 0) {

        const colors = stroke.gradientStops.map((stop: any) => {
          const alpha = stop.color.a !== undefined ? stop.color.a : 1;
          return colorToHex(stop.color, alpha);
        });
        props.stroke = colors;

        if (stroke.gradientStops.length > 1) {
          const stops = stroke.gradientStops.map((stop: any) => stop.position);
          props.strokeGradientStops = stops;
        }
      }

      // Only export strokeWeight if there's a visible stroke
      if ('strokeWeight' in node && node.strokeWeight !== undefined && !isMixed(node.strokeWeight) &&
          typeof node.strokeWeight === 'number' && node.strokeWeight > 0) {
        // For Text use 'strokeThickness', for others use 'strokeWidth'
        const strokeProperty = node.type === 'TEXT' ? 'strokeThickness' : 'strokeWidth';
        props[strokeProperty] = Math.round(node.strokeWeight);
      }
    }
  }

  return props;
}
