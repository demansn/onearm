/**
 * @fileoverview Node utility functions for name processing and size checks
 */

/**
 * Mapping Figma node types to Pixi components
 */
export const NODE_TYPE_MAPPING = {
  'GROUP': 'SuperContainer',
  'FRAME': 'SuperContainer', // Default for Frame, will be overridden if AutoLayout
  'COMPONENT': 'Component',
  'COMPONENT_SET': 'Component',
  'INSTANCE': 'Component',
  'TEXT': 'Text',
  'RECTANGLE': 'Rectangle',
  'ELLIPSE': 'Ellipse',
  'VECTOR': 'Graphics'
};

/**
 * Check if instance should export size for scaling
 * Returns true if instance name contains scale markers
 */
export function shouldExportInstanceSize(name: string): boolean {
  if (!name) return false;
  return name.endsWith('*') ||
         name.includes('[scaled]') ||
         name.includes('@size');
}

/**
 * Clean size marker suffixes from object name
 */
export function cleanNameFromSizeMarker(name: string): string {
  if (!name) return name;

  let cleanName = name.replace(/\*$/, '');
  cleanName = cleanName.replace(/\s*\[scaled\]\s*/g, '');
  cleanName = cleanName.replace(/\s*@size\s*/g, '');

  return cleanName.trim();
}
