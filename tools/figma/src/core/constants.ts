/**
 * Zone names that use constraint-based positioning
 */
export const ZONE_NAMES = ['GameZone', 'FullScreenZone', 'SaveZone'] as const;

/**
 * Check if a type string is a special zone
 */
export function isSpecialZone(type: string): boolean {
  return (ZONE_NAMES as readonly string[]).indexOf(type) !== -1;
}

/**
 * Component suffix to export type mapping
 */
export const COMPONENT_SUFFIX_MAP: Record<string, string> = {
  'Button': 'Button',
  'Toggle': 'CheckBoxComponent',
  'ValueSlider': 'ValueSlider',
  'ScrollBox': 'ScrollBox',
  'ProgressBar': 'ProgressBar',
};

/**
 * Component exact name to export type mapping
 */
export const COMPONENT_EXACT_NAME_MAP: Record<string, string> = {
  'RadioGroup': 'RadioGroup',
  'DotsGroup': 'DotsGroup',
  'ReelsLayout': 'ReelsLayoutConfig'
};

/**
 * Default page name for export
 */
export const DEFAULT_PAGE_NAME = 'layouts';

/**
 * Node name to skip during export
 */
export const SKIP_NODE_NAME = 'screen';
