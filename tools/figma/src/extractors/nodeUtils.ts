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

  // Check for scale markers in name:
  // - Names ending with "*" (e.g., "Button*")
  // - Names containing "[scaled]" (e.g., "Button [scaled]")
  // - Names containing "@size" (e.g., "Button @size")
  return name.endsWith('*') ||
         name.includes('[scaled]') ||
         name.includes('@size');
}

/**
 * Clean size marker suffixes from object name
 */
export function cleanNameFromSizeMarker(name: string): string {
  if (!name) return name;

  // Remove "*" suffix
  let cleanName = name.replace(/\*$/, '');

  // Remove "[scaled]" marker
  cleanName = cleanName.replace(/\s*\[scaled\]\s*/g, '');

  // Remove "@size" marker
  cleanName = cleanName.replace(/\s*@size\s*/g, '');

  return cleanName.trim();
}

/**
 * Check if component should be treated as VariantsContainer
 * Returns true if component name ends with "Variants"
 */
export function isVariantsContainer(name: string): boolean {
  if (!name) return false;
  const cleanName = cleanNameFromSizeMarker(name);
  return cleanName.endsWith('Variants');
}

/**
 * Check if component should be treated as DotsGroup
 * Returns true if component name is "DotsGroup"
 */
export function isDotsGroup(name: string): boolean {
  if (!name) return false;
  const cleanName = cleanNameFromSizeMarker(name);
  return cleanName === 'DotsGroup';
}

/**
 * Check if component should be treated as ReelsLayout
 * Returns true if component name is "ReelsLayout"
 */
export function isReelsLayout(name: string): boolean {
  if (!name) return false;
  const cleanName = cleanNameFromSizeMarker(name);
  return cleanName === 'ReelsLayout';
}

/**
 * Check if component should be treated as RadioGroup
 * Returns true if component name is "RadioGroup"
 */
export function isRadioGroup(name: string): boolean {
  if (!name) return false;
  const cleanName = cleanNameFromSizeMarker(name);
  return cleanName === 'RadioGroup';
}

/**
 * Check if component should be treated as ValueSlider
 * Returns true if component name ends with "ValueSlider"
 */
export function isValueSlider(name: string): boolean {
  if (!name) return false;
  const cleanName = cleanNameFromSizeMarker(name);
  return cleanName.endsWith('ValueSlider');
}

/**
 * Check if component should be treated as ScrollBox
 * Returns true if component name ends with "ScrollBox"
 */
export function isScrollBox(name: string): boolean {
  if (!name) return false;
  const cleanName = cleanNameFromSizeMarker(name);
  return cleanName.endsWith('ScrollBox');
}
