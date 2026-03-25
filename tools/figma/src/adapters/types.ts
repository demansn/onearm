/**
 * @fileoverview Abstract node interfaces for data source independence.
 * Both Plugin API and REST API adapters produce these types.
 */

import { MixedValue } from './mixed';

/**
 * Unified color type (both APIs use 0-1 range for r,g,b)
 */
export interface UnifiedColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

/**
 * Unified paint type covering solid, gradient, image fills
 */
export interface UnifiedPaint {
  type: string;
  visible?: boolean;
  color?: UnifiedColor;
  opacity?: number;
  gradientStops?: Array<{ color: UnifiedColor; position: number }>;
  gradientTransform?: number[][];
}

/**
 * Unified constraint type
 */
export interface UnifiedConstraints {
  horizontal: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE';
  vertical: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE';
}

/**
 * Unified font name
 */
export interface UnifiedFontName {
  family: string;
  style: string;
}

/**
 * Unified line height
 */
export interface UnifiedLineHeight {
  unit: 'AUTO' | 'PIXELS' | 'PERCENT';
  value: number;
}

/**
 * Component map entry stored in processing context
 */
export interface ComponentMapEntry {
  name: string;
  width: number;
  height: number;
  node?: AbstractNode;
}

/**
 * Normalized node interface that both adapters produce.
 * Property names match Plugin API for minimal migration effort.
 * All positional values are RELATIVE to the parent.
 */
export interface AbstractNode {
  // Identity
  readonly id: string;
  readonly type: string;
  readonly name: string;

  // Geometry (relative to parent)
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;

  // Visibility
  readonly visible: boolean;
  readonly opacity: number | MixedValue;
  readonly rotation: number | MixedValue;

  // Layout (FRAME only)
  readonly layoutMode?: string;
  readonly itemSpacing?: number;
  readonly counterAxisSpacing?: number;
  readonly layoutSizingHorizontal?: string;
  readonly layoutSizingVertical?: string;
  readonly primaryAxisAlignItems?: string;
  readonly counterAxisAlignItems?: string;
  readonly layoutGrids?: any[];
  readonly clipsContent?: boolean;

  // Constraints
  readonly constraints?: UnifiedConstraints;

  // Visual
  readonly fills: readonly UnifiedPaint[] | MixedValue;
  readonly strokes: readonly UnifiedPaint[] | MixedValue;
  readonly strokeWeight: number | MixedValue;
  readonly cornerRadius: number | MixedValue;
  readonly topLeftRadius?: number;
  readonly topRightRadius?: number;
  readonly bottomLeftRadius?: number;
  readonly bottomRightRadius?: number;

  // Text (TEXT nodes only)
  readonly characters?: string;
  readonly fontName?: UnifiedFontName | MixedValue;
  readonly fontSize?: number | MixedValue;
  readonly fontWeight?: number | MixedValue;
  readonly lineHeight?: UnifiedLineHeight | MixedValue;
  readonly textAlignHorizontal?: string | MixedValue;
  readonly textAutoResize?: string | MixedValue;

  // Component (INSTANCE nodes)
  readonly mainComponentId?: string;
  readonly componentProperties?: Record<string, any>;

  // Variant properties (COMPONENT inside COMPONENT_SET)
  readonly variantProperties?: Record<string, string> | null;

  // Component definitions (COMPONENT/COMPONENT_SET)
  readonly componentPropertyDefinitions?: Record<string, any>;

  // Parent info (populated by adapter during traversal)
  readonly parentType?: string;

  // Tree
  readonly children: readonly AbstractNode[];
}

/**
 * Abstraction over document-level operations.
 * Plugin adapter wraps figma.root; REST adapter wraps GET /v1/files/:key response.
 */
export interface DocumentProvider {
  /** Get all pages in the document */
  getPages(): AbstractNode[];

  /** Find a page by name */
  findPageByName(name: string): AbstractNode | undefined;

  /** Build component map across all pages */
  buildComponentMap(): Map<string, ComponentMapEntry>;
}
