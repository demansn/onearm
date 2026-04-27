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
      // For Text (PIXI 8): emit a structured FillGradient descriptor.
      // The engine hydrates this into `new FillGradient(...)` at runtime.
      const colorStops = fill.gradientStops.map((stop: any) => {
        const alpha = stop.color.a !== undefined ? stop.color.a : 1;
        return {
          offset: stop.position,
          color: colorToHex(stop.color, alpha),
        };
      });

      const props: any = {};

      if (fill.type === 'GRADIENT_LINEAR') {
        const { start, end } = linearGradientEndpoints(fill.gradientTransform);
        props.fill = { type: 'linear', start, end, colorStops };
      } else if (fill.type === 'GRADIENT_RADIAL') {
        const { center, outerRadius } = radialGradientShape(fill.gradientTransform);
        props.fill = { type: 'radial', center, innerRadius: 0, outerRadius, colorStops };
      } else {
        // Angular (and any future type) is not supported by FillGradient.
        // Fall back to a vertical linear gradient using the same color stops.
        props.fill = {
          type: 'linear',
          start: { x: 0.5, y: 0 },
          end: { x: 0.5, y: 1 },
          colorStops,
        };
      }

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

/**
 * Convert Figma `gradientTransform` (2x3 matrix that maps gradient unit-space → layer
 * normalized space) into linear gradient start/end points in PIXI FillGradient local
 * coordinates (0..1 of the fill bounding box).
 *
 * Figma docs: the transform is applied to the unit gradient (a horizontal segment from
 * (0,0) to (1,0)) to produce the gradient in the layer's normalized coordinates.
 * To recover the segment endpoints in layer space we invert the matrix.
 */
function linearGradientEndpoints(
  transform: readonly (readonly number[])[] | undefined
): { start: { x: number; y: number }; end: { x: number; y: number } } {
  const fallback = {
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  };
  if (!transform || transform.length < 2) return fallback;

  const a = transform[0][0];
  const c = transform[0][1];
  const e = transform[0][2];
  const b = transform[1][0];
  const d = transform[1][1];
  const f = transform[1][2];
  const det = a * d - b * c;
  if (!det) return fallback;

  const inv00 = d / det;
  const inv01 = -c / det;
  const inv02 = (c * f - d * e) / det;
  const inv10 = -b / det;
  const inv11 = a / det;
  const inv12 = (b * e - a * f) / det;

  // Apply inverse to gradient unit-space points (0,0) and (1,0).
  const startX = inv02;
  const startY = inv12;
  const endX = inv00 + inv02;
  const endY = inv10 + inv12;

  const round = (v: number) => Math.round(v * 1000) / 1000;

  return {
    start: { x: round(startX), y: round(startY) },
    end: { x: round(endX), y: round(endY) },
  };
}

/**
 * Convert Figma radial `gradientTransform` into PIXI FillGradient radial parameters.
 * Center comes from the translation column; outerRadius is the average scale magnitude.
 */
function radialGradientShape(
  transform: readonly (readonly number[])[] | undefined
): { center: { x: number; y: number }; outerRadius: number } {
  if (!transform || transform.length < 2) {
    return { center: { x: 0.5, y: 0.5 }, outerRadius: 0.5 };
  }
  const a = transform[0][0];
  const c = transform[0][1];
  const e = transform[0][2];
  const b = transform[1][0];
  const d = transform[1][1];
  const f = transform[1][2];
  const det = a * d - b * c;
  // Center of the gradient in layer space is inverse(M) * (0.5, 0.5).
  let cx = 0.5;
  let cy = 0.5;
  if (det) {
    const inv00 = d / det;
    const inv01 = -c / det;
    const inv02 = (c * f - d * e) / det;
    const inv10 = -b / det;
    const inv11 = a / det;
    const inv12 = (b * e - a * f) / det;
    cx = 0.5 * inv00 + 0.5 * inv01 + inv02;
    cy = 0.5 * inv10 + 0.5 * inv11 + inv12;
  }
  const scaleX = Math.sqrt(a * a + b * b);
  const scaleY = Math.sqrt(c * c + d * d);
  const outerRadius = (scaleX + scaleY) * 0.5 || 0.5;
  const round = (v: number) => Math.round(v * 1000) / 1000;
  return {
    center: { x: round(cx), y: round(cy) },
    outerRadius: round(outerRadius),
  };
}
