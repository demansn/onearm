/**
 * @fileoverview Color utility functions for Figma to Pixi conversion
 */

import type { RGB, RGBA } from './types';

/**
 * Convert Figma color to rgba string
 */
export function colorToHex(color: RGB | RGBA, alpha?: number): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = alpha !== undefined ? alpha : ('a' in color ? color.a : 1);
  return `rgba(${r},${g},${b},${a})`;
}
