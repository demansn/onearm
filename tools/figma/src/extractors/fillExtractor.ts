/**
 * @fileoverview Fill properties extractor for Figma nodes
 */

import type { AbstractNode, Paint } from './types';
import { isMixed } from '../adapters/mixed';
import { colorToHex } from './colorUtils';

/**
 * Extract fill properties from node
 */
export function extractFillProps(node: AbstractNode): any {
  if (!('fills' in node) || !node.fills) {
    return {};
  }

  // Check for mixed fills (return empty if mixed)
  if (isMixed(node.fills)) {
    return {};
  }

  const allFills = node.fills as readonly Paint[];
  if (allFills.length === 0) {
    return {};
  }

  // Find first visible fill
  const fills = allFills.filter((fill) => fill.visible !== false);
  const fill = fills[fills.length - 1];
  if (!fill) {
    return {};
  }

  // Handle solid fills
  if (fill.type === 'SOLID') {
    const props: any = { fill: colorToHex(fill.color!) };

    // Add opacity if it's not fully opaque
    if (fill.opacity !== undefined && fill.opacity !== 1) {
      props.alpha = fill.opacity;
    }

    return props;
  }

  // Handle gradient fills
  if ((fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL' || fill.type === 'GRADIENT_ANGULAR') &&
      fill.gradientStops && fill.gradientStops.length > 0) {

    if (node.type === 'TEXT') {
      // For Text: full gradient support
      const colors = fill.gradientStops.map((stop: any) => {
        const alpha = stop.color.a !== undefined ? stop.color.a : 1;
        return colorToHex(stop.color, alpha);
      });
      const stops = fill.gradientStops.map((stop: any) => stop.position);

      const props: any = {
        fill: colors,
        fillGradientStops: stops
      };

      // Add opacity if it's not fully opaque
      if (fill.opacity !== undefined && fill.opacity !== 1) {
        props.alpha = fill.opacity;
      }

      return props;
    } else {
      // For non-Text: full gradient support
      const colors = fill.gradientStops.map((stop: any) => {
        const alpha = stop.color.a !== undefined ? stop.color.a : 1;
        return colorToHex(stop.color, alpha);
      });
      const stops = fill.gradientStops.map((stop: any) => stop.position);

      const props: any = {
        fill: colors,
        colorStops: stops
      };

      // Add gradient type and direction information
      if (fill.type === 'GRADIENT_LINEAR') {
        props.gradientType = 'linear';

        // Calculate gradient angle from transform matrix
        if (fill.gradientTransform && fill.gradientTransform.length >= 2) {
          const transform = fill.gradientTransform;
          // Extract angle from transformation matrix
          const dx = transform[0][0];
          const dy = transform[0][1];
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);

          props.gradientAngle = Math.round(angle);
        } else {
          props.gradientAngle = 0; // Default horizontal
        }
      } else if (fill.type === 'GRADIENT_RADIAL') {
        props.gradientType = 'radial';

        // Extract center and radius from gradient transform
        if (fill.gradientTransform && fill.gradientTransform.length >= 2) {
          const transform = fill.gradientTransform;

          // Extract center position from transform
          const centerX = transform[0][2] || 0.5;
          const centerY = transform[1][2] || 0.5;

          props.gradientCenter = {
            x: Math.round(centerX * 100) / 100,
            y: Math.round(centerY * 100) / 100
          };

          // Calculate radius from transform scale
          const scaleX = Math.sqrt(transform[0][0] * transform[0][0] + transform[0][1] * transform[0][1]);
          const scaleY = Math.sqrt(transform[1][0] * transform[1][0] + transform[1][1] * transform[1][1]);
          const radius = Math.max(scaleX, scaleY);
          props.gradientRadius = Math.round(radius * 100) / 100;
        } else {
          props.gradientCenter = { x: 0.5, y: 0.5 };
          props.gradientRadius = 1;
        }
      } else if (fill.type === 'GRADIENT_ANGULAR') {
        props.gradientType = 'angular';

        // Extract center for angular gradient
        if (fill.gradientTransform && fill.gradientTransform.length >= 2) {
          const transform = fill.gradientTransform;
          const centerX = transform[0][2] || 0.5;
          const centerY = transform[1][2] || 0.5;

          props.gradientCenter = {
            x: Math.round(centerX * 100) / 100,
            y: Math.round(centerY * 100) / 100
          };
        } else {
          props.gradientCenter = { x: 0.5, y: 0.5 };
        }
      }

      // Add opacity if it's not fully opaque
      if (fill.opacity !== undefined && fill.opacity !== 1) {
        props.alpha = fill.opacity;
      }

      return props;
    }
  }

  return {};
}
