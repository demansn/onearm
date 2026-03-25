/**
 * @fileoverview Main exports for all property extractors
 */

// Types (re-export for convenience)
export type * from './types';

// Utilities
export { colorToHex } from './colorUtils';
export { NODE_TYPE_MAPPING, shouldExportInstanceSize, cleanNameFromSizeMarker } from './nodeUtils';

// Property extractors
export { extractAutoLayoutProps } from './autoLayoutExtractor';
export { extractFillProps } from './fillExtractor';
export { extractStrokeProps } from './strokeExtractor';
export { extractCornerProps } from './cornerExtractor';
export { extractTextProps } from './textExtractor';
export { extractCommonProps } from './commonExtractor';

// Positioning utilities
export { calculateTextPositioning, extractZoneChildProps } from './positioningUtils';

// Variant utilities
export { extractVariantProps, extractInstanceVariant, extractComponentProps, resolveVariantFromMainComponent, extractPropertyDefinitions } from './variantExtractor';
