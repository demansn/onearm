/**
 * @fileoverview Schema for components.config.json
 *
 * This file is the single source of truth for the structure of components.config.json —
 * the layout configuration format used by the onearm slot engine.
 *
 * **Producer:** Figma export tool (`tools/figma/src/`) — generates the config from Figma designs.
 * **Consumer:** LayoutBuilder (`modules/engine/services/LayoutBuilder.js`) — builds display object trees at runtime.
 *
 * Every field is documented with its origin (Figma extractor or special processor),
 * its consumer in the engine, and valid values.
 */

// =============================================================================
// Top-Level Document
// =============================================================================

/** Root structure of components.config.json */
export interface ComponentsConfigDocument {
  /** Array of all exported component configurations */
  components: ComponentConfig[];
  /** Export metadata and statistics */
  metadata: ExportMetadata;
}

/** Export metadata appended by the Figma export pipeline */
export interface ExportMetadata {
  /** ISO 8601 timestamp of the export */
  exportedAt: string;
  /** Aggregated statistics about exported components */
  statistics: {
    totalComponents: number;
    scenes: number;
    componentsWithVariants: number;
    componentsFlat: number;
    /** Count of components per mode name */
    modesByName?: Record<string, number>;
  };
  /** Figma file key used for the export */
  figmaFileKey?: string;
  /** Diagnostic warnings (e.g. name collisions) */
  warnings?: string[];
}

// =============================================================================
// Component Config (Discriminated Union)
// =============================================================================

/**
 * A single component configuration. Discriminated by the `type` field.
 *
 * Top-level components appear in three structural forms:
 * 1. **Flat** — no `variants` or `modes`, properties are inline.
 * 2. **With `variants`** — keyed by variant name (visual states, sizes).
 * 3. **Scene with `modes`** — keyed by viewport mode (default/portrait/landscape).
 */
export type ComponentConfig =
  | SceneConfig
  | SuperContainerConfig
  | BaseContainerConfig
  | AutoLayoutConfig
  | TextConfig
  | EngineTextConfig
  | DOMTextConfig
  | BitmapTextConfig
  | RectangleConfig
  | ButtonConfig
  | CheckBoxConfig
  | DotsGroupConfig
  | RadioGroupConfig
  | ReelsConfig
  | FullScreenZoneConfig
  | GameZoneConfig
  | SaveZoneConfig
  | ScrollBoxConfig
  | ValueSliderConfig
  | ScrollBarConfig
  | ProgressBarConfig
  | SpineAnimationConfig;

// =============================================================================
// Common Property Groups
// =============================================================================

/**
 * Base properties shared by every component in the config.
 * Extracted by `commonExtractor.ts`.
 */
export interface BaseProps {
  /**
   * Unique component name. Used as lookup key in LayoutBuilder._layoutConfigMap.
   * Cleaned from Figma size markers (`*`, `[scaled]`, `@size`).
   *
   * At runtime, mapped to `displayObject.label`.
   */
  name: string;

  /**
   * Component type string. Determines which builder/factory handles this config.
   * - Registered types → specific builder (Button, ScrollBox, etc.)
   * - Unregistered types starting with uppercase → `buildComponent()` with factory lookup
   * - Fallback → BaseContainer
   */
  type: string;
}

/**
 * Visual/transform properties applied by `LayoutBuilder.applyProperties()`.
 * All are optional — omitted means "use default".
 */
export interface DisplayProps {
  /** X position relative to parent (pixels). Omitted at root level. */
  x?: number;
  /** Y position relative to parent (pixels). Omitted at root level. */
  y?: number;
  /** Explicit width (pixels). Exported for Rectangle, marked objects, instances. */
  width?: number;
  /** Explicit height (pixels). Exported for Rectangle, marked objects, instances. */
  height?: number;

  /**
   * Scale transform.
   * - `number` — uniform scale on both axes.
   * - `{ x, y }` — per-axis scale.
   *
   * Applied via `displayObject.scale.set()`.
   */
  scale?: number | { x: number; y: number };

  /** Rotation angle in degrees. Extracted from Figma radians. Applied to `displayObject.angle`. */
  angle?: number;
  /** Opacity (0–1). Only exported if != 1. Applied to `displayObject.alpha`. */
  alpha?: number;
  /** Visibility. Only exported if `false` (hidden in Figma). */
  visible?: boolean;

  /**
   * Horizontal anchor point (0–1). Derived from Figma text constraints.
   * 0 = left, 0.5 = center, 1 = right.
   */
  anchorX?: number;
  /**
   * Vertical anchor point (0–1). Derived from Figma text constraints.
   * 0 = top, 0.5 = center, 1 = bottom.
   */
  anchorY?: number;
}

/**
 * Properties present on instance children (`isInstance: true`).
 * An instance references a component defined elsewhere in the config or in the Figma file.
 */
export interface InstanceProps {
  /**
   * Marks this child as a component instance.
   * When true, `type` contains the referenced component name (not a built-in type).
   * LayoutBuilder resolves it via `getLayoutConfig(type)` or ObjectFactory fallback.
   */
  isInstance: true;

  /**
   * Selected variant of the referenced component.
   * Single property: just the value string (e.g. `"hover"`).
   * Multiple properties: comma-separated sorted pairs (e.g. `"size=large,state=active"`).
   */
  variant?: string;

  /**
   * Component properties extracted from the Figma instance.
   * Keys are property names (cleaned from Figma internal IDs).
   * Values are strings or booleans.
   *
   * Applied via `LayoutBuilder.#applyComponentProperties()` — sets matching
   * properties directly on the display object.
   */
  componentProperties?: Record<string, string | boolean>;
}

// =============================================================================
// Styles
// =============================================================================

/**
 * Text style object. Bridges Figma text properties to PixiJS TextStyle.
 * Extracted by `textExtractor.ts` + `fillExtractor.ts` + `strokeExtractor.ts`.
 */
export interface TextStyle {
  /** Font family name (e.g. "Nunito"). From Figma fontName.family. */
  fontFamily?: string;
  /** Font size in pixels. */
  fontSize?: number;
  /** Font weight (400, 700, 900, etc.). */
  fontWeight?: number;
  /** Line height in pixels. Resolved from Figma PERCENT or PIXELS units. */
  lineHeight?: number;
  /** Text alignment. */
  align?: 'left' | 'center' | 'right' | 'justify';

  /** Enable word wrapping. Set when Figma textAutoResize = "HEIGHT" (fixed width, auto height). */
  wordWrap?: boolean;
  /** Word wrap width in pixels. Set together with `wordWrap: true`. */
  wordWrapWidth?: number;

  /**
   * Fill color.
   * - `string` — solid color in `"rgba(R,G,B,A)"` or `"#hex"` format.
   * - `string[]` — gradient stop colors (requires `fillGradientStops`).
   */
  fill?: string | string[];
  /** Gradient stop positions (0–1) for text fill gradient. */
  fillGradientStops?: number[];

  /**
   * Stroke color.
   * - `string` — solid stroke color.
   * - `string[]` — gradient stroke colors (requires `strokeGradientStops`).
   */
  stroke?: string | string[];
  /** Stroke width in pixels. */
  strokeWidth?: number;
  /** Gradient stop positions (0–1) for text stroke gradient. */
  strokeGradientStops?: number[];
}

/**
 * Style object for Rectangle components.
 * Extracted by `fillExtractor.ts`, `strokeExtractor.ts`, `cornerExtractor.ts`.
 */
export interface RectangleStyle {
  /**
   * Fill color.
   * - `string` — solid color (`"rgba(R,G,B,A)"` or `"#hex"`).
   * - `string[]` — gradient stop colors (used with top-level gradient props).
   */
  fill?: string | string[];
  /** Stroke color (solid). */
  stroke?: string;
  /** Stroke width in pixels. */
  strokeWidth?: number;
  /** Fill opacity (0–1). Only if != 1. */
  alpha?: number;

  /**
   * Corner radius.
   * - `number` — uniform radius for all corners.
   * - `object` — per-corner radius.
   */
  cornerRadius?: number | {
    topLeft: number;
    topRight: number;
    bottomRight: number;
    bottomLeft: number;
  };
}

/**
 * Gradient properties for non-text elements (Rectangle, shapes).
 * Extracted by `fillExtractor.ts`. Applied at the component level, not inside `style`.
 *
 * Consumed by `Rectangle.js` and applied via `LayoutBuilder.applyProperties()`.
 */
export interface GradientProps {
  /** Gradient stop positions (0–1). For non-text: named `colorStops`. */
  colorStops?: number[];
  /** Gradient type. */
  gradientType?: 'linear' | 'radial' | 'angular';
  /** Gradient angle in degrees (linear only). */
  gradientAngle?: number;
  /** Gradient center (0–1 normalized). For radial and angular. */
  gradientCenter?: { x: number; y: number };
  /** Gradient radius (0–1 normalized). Radial only. */
  gradientRadius?: number;
}

// =============================================================================
// Zone Alignment (for FullScreenZone / GameZone / SaveZone children)
// =============================================================================

/**
 * Positioning properties for children of zone containers.
 * Replaces absolute `x`/`y` with constraint-based alignment.
 *
 * Extracted by `positioningUtils.extractZoneChildProps()` from Figma constraints.
 * Consumed via `child.display = { align, offset }` in ZoneContainer layout.
 */
export interface ZoneChildAlignment {
  /** Alignment anchors derived from Figma constraints. */
  align: {
    x: 'left' | 'right' | 'center' | 'absolute';
    y: 'top' | 'bottom' | 'center' | 'absolute';
  };
  /** Offset from the aligned edge/center. */
  offset?: {
    /** Distance from left edge of zone to left edge of object (px). `align.x = "left"`. */
    left?: number;
    /** Distance from right edge of zone to right edge of object (px). `align.x = "right"`. */
    right?: number;
    /** Distance from top edge of zone to top edge of object (px). `align.y = "top"`. */
    top?: number;
    /** Distance from bottom edge of zone to bottom edge of object (px). `align.y = "bottom"`. */
    bottom?: number;
    /** Offset from zone center X to object center X (px). `align.x = "center"`. */
    centerX?: number;
    /** Offset from zone center Y to object center Y (px). `align.y = "center"`. */
    centerY?: number;
    /** Absolute X position or percentage (px or `"50.0%"`). `align.x = "absolute"`. */
    x?: number | string;
    /** Absolute Y position or percentage (px or `"50.0%"`). `align.y = "absolute"`. */
    y?: number | string;
  };
}

// =============================================================================
// Child Config (recursive)
// =============================================================================

/**
 * A child element in a `children` array.
 * Can be any component config, an instance reference, or a synthetic mask.
 *
 * Zone children additionally carry `align`/`offset` instead of `x`/`y`.
 */
export type ChildConfig = (
  | ContainerChild
  | TextChild
  | EngineTextChild
  | BitmapTextChild
  | RectangleChild
  | ButtonChild
  | InstanceChild
  | SpineAnimationChild
  | AutoLayoutChild
) & Partial<ZoneChildAlignment>;

/** Generic container child (SuperContainer or similar). */
export interface ContainerChild extends BaseProps, DisplayProps {
  type: 'SuperContainer' | 'BaseContainer';
  children?: ChildConfig[];
}

/** Text child. */
export interface TextChild extends BaseProps, DisplayProps {
  type: 'Text';
  text: string;
  style: TextStyle;
}

/** EngineText child (auto-scaling text with maxWidth). */
export interface EngineTextChild extends BaseProps, DisplayProps {
  type: 'EngineText';
  text: string;
  /** Maximum width in pixels. Text auto-scales down if wider. */
  maxWidth: number;
  style: TextStyle;
}

/** BitmapText child (PIXI v8 BitmapText, pre-baked font atlas). */
export interface BitmapTextChild extends BaseProps, DisplayProps {
  type: 'BitmapText';
  text: string;
  style: TextStyle;
}

/** Rectangle child (drawn shape). */
export interface RectangleChild extends BaseProps, DisplayProps, GradientProps {
  type: 'Rectangle';
  width: number;
  height: number;
  style: RectangleStyle;
}

/** Button child (when nested inside another component). */
export interface ButtonChild extends BaseProps, DisplayProps {
  type: 'Button';
  image?: ChildConfig;
  animation?: boolean;
  text?: string;
  textStyle?: TextStyle;
}

/** AutoLayout child. */
export interface AutoLayoutChild extends BaseProps, DisplayProps {
  type: 'AutoLayout';
  children?: ChildConfig[];
  /** Fixed size. Omitted dimensions use HUG (fit content). */
  size?: { width?: number; height?: number };
  /** Flow direction. */
  flow: 'horizontal' | 'vertical';
  /** Gap between children (px). */
  gap?: number;
  /** Distribute children with equal spacing. */
  spaceBetween?: boolean;
  /** Content alignment within the container. */
  contentAlign?: {
    x: 'left' | 'center' | 'right' | 'space-between' | 'space-around' | 'space-evenly';
    y: 'top' | 'center' | 'bottom' | 'space-between' | 'space-around' | 'space-evenly';
  };
}

/**
 * Instance child — references a component defined elsewhere.
 * `type` is the referenced component name (arbitrary string), not a built-in type.
 */
export interface InstanceChild extends BaseProps, DisplayProps, InstanceProps {
  isInstance: true;
  children?: ChildConfig[];
}

/** SpineAnimation child — a Spine skeleton instance. */
export interface SpineAnimationChild extends BaseProps, DisplayProps {
  type: 'SpineAnimation';
  /** Spine parameters (resolved from Figma component properties). */
  params: SpineParams;
}

// =============================================================================
// Component Type Definitions
// =============================================================================

// --- Scenes ---

/**
 * Scene — a top-level screen with viewport-dependent layout modes.
 * Generated from Figma COMPONENT_SET with `isScene: true` in componentRegistry.
 *
 * Consumed by `LayoutBuilder.buildScreenLayout()` → creates a `ScreenLayout` instance.
 * ScreenLayout filters modes by device: desktop gets "default"/"desktop",
 * mobile gets "portrait"/"landscape" (+ "default" as fallback).
 */
export interface SceneConfig extends BaseProps {
  type: 'Scene';
  /**
   * Viewport layout modes. Keys are mode names.
   * Each mode contains a full layout tree (typically a SuperContainer with children).
   */
  modes: {
    [mode in 'default' | 'portrait' | 'landscape' | 'desktop']?: ModeConfig;
  };
}

/** A single mode's layout configuration within a Scene. */
export interface ModeConfig {
  /** Container type for this mode (usually "SuperContainer" or "BaseContainer"). */
  type: string;
  /** Child elements of this mode's layout. */
  children?: ChildConfig[];
  /** Any additional display/layout properties. */
  [key: string]: any;
}

// --- Containers ---

/**
 * SuperContainer — generic container (Figma FRAME or GROUP without AutoLayout).
 * The most common container type in the config.
 *
 * May optionally have `variants` for multi-state components.
 */
export interface SuperContainerConfig extends BaseProps, DisplayProps {
  type: 'SuperContainer';
  children?: ChildConfig[];
  /** Visual state variants (e.g. size variants, visual states). */
  variants?: VariantMap;
}

/**
 * BaseContainer — placeholder container with explicit dimensions.
 * Generated for Figma nodes with `_ph` suffix (placeholders for child scenes).
 *
 * Used as mount points for child scenes via `Scene.mountInPlaceholder()`.
 */
export interface BaseContainerConfig extends BaseProps, DisplayProps {
  type: 'BaseContainer';
  width: number;
  height: number;
}

/**
 * AutoLayout — Figma Auto Layout container.
 * Generated for FRAMEs with `layoutMode` set.
 *
 * Consumed by the Layout system (`Layout.js`) for automatic child positioning.
 */
export interface AutoLayoutConfig extends BaseProps, DisplayProps {
  type: 'AutoLayout';
  children?: ChildConfig[];
  /** Visual state variants. */
  variants?: VariantMap;

  /**
   * Fixed size dimensions. Omitted dimensions use HUG (fit content).
   * Set when Figma `layoutSizingHorizontal`/`layoutSizingVertical` is not "HUG".
   */
  size?: { width?: number; height?: number };

  /** Flow direction (from Figma layoutMode). */
  flow: 'horizontal' | 'vertical';
  /** Gap between children in pixels (from Figma itemSpacing). */
  gap?: number;
  /** Distribute children evenly (from Figma primaryAxisAlignItems = "SPACE_BETWEEN"). */
  spaceBetween?: boolean;

  /**
   * Content alignment within the container.
   * Maps from Figma primaryAxisAlignItems/counterAxisAlignItems.
   */
  contentAlign?: {
    x: 'left' | 'center' | 'right' | 'space-between' | 'space-around' | 'space-evenly';
    y: 'top' | 'center' | 'bottom' | 'space-between' | 'space-around' | 'space-evenly';
  };
}

// --- Zones ---

/**
 * FullScreenZone — responsive zone that fills the entire screen.
 * Children use constraint-based `align`/`offset` instead of absolute `x`/`y`.
 *
 * Created from Figma FRAME named "FullScreenZone".
 * Consumed by `LayoutBuilder.buildZoneContainerLayout()`.
 */
export interface FullScreenZoneConfig extends BaseProps, DisplayProps {
  type: 'FullScreenZone';
  children?: (ChildConfig & ZoneChildAlignment)[];
}

/**
 * GameZone — responsive zone for the game area.
 * Same alignment system as FullScreenZone.
 */
export interface GameZoneConfig extends BaseProps, DisplayProps {
  type: 'GameZone';
  children?: (ChildConfig & ZoneChildAlignment)[];
}

/**
 * SaveZone — responsive safe area zone.
 * Same alignment system as FullScreenZone.
 */
export interface SaveZoneConfig extends BaseProps, DisplayProps {
  type: 'SaveZone';
  children?: (ChildConfig & ZoneChildAlignment)[];
}

// --- Text ---

/**
 * Text — standard text element.
 * Generated from Figma TEXT nodes with textAutoResize = "WIDTH_AND_HEIGHT" (auto)
 * or "HEIGHT" (fixed width, word wrap).
 */
export interface TextConfig extends BaseProps, DisplayProps {
  type: 'Text';
  /** Text content (from Figma characters). */
  text: string;
  /** Text style. */
  style: TextStyle;
}

/**
 * EngineText — auto-scaling text with maxWidth constraint.
 * Generated from Figma TEXT nodes with textAutoResize = "NONE" (fixed width and height).
 *
 * At runtime, `EngineText` scales text down automatically when it exceeds `maxWidth`.
 */
export interface EngineTextConfig extends BaseProps, DisplayProps {
  type: 'EngineText';
  /** Text content. */
  text: string;
  /** Maximum width in pixels. Text auto-scales to fit within this width. */
  maxWidth: number;
  /** Text style. */
  style: TextStyle;
}

/**
 * DOMText — DOM-based text element for native HTML rendering.
 * Generated from Figma components with "DOMText" suffix.
 */
export interface DOMTextConfig extends BaseProps, DisplayProps {
  type: 'DOMText';
  width: number;
  height: number;
  /** Text content. */
  text: string;
  /** Text style. */
  style: TextStyle;
}

/**
 * BitmapText — PIXI v8 BitmapText rendered from a pre-baked font atlas.
 * Generated from Figma TEXT nodes whose name ends with "BMP", or from
 * COMPONENT/INSTANCE nodes whose name ends with "BMP".
 *
 * Requires the bitmap font to be registered at runtime (e.g. via `.fnt/.xml`
 * files under `assets/bitmap-fonts/`). `style.fontFamily` must match the
 * registered bitmap font name.
 */
export interface BitmapTextConfig extends BaseProps, DisplayProps {
  type: 'BitmapText';
  /** Text content. */
  text: string;
  /** Text style. `fontFamily` must match a loaded bitmap font. */
  style: TextStyle;
}

// --- Graphics ---

/**
 * Rectangle — drawn shape with fill, stroke, and corner radius.
 * Generated from Figma RECTANGLE nodes.
 *
 * Gradient properties are at the top level (not inside `style`) for non-text elements.
 */
export interface RectangleConfig extends BaseProps, DisplayProps, GradientProps {
  type: 'Rectangle';
  width: number;
  height: number;
  /** Shape style (fill, stroke, cornerRadius). */
  style: RectangleStyle;
}

// --- Button ---

/**
 * Button — interactive button component.
 * Generated in three forms depending on Figma structure:
 *
 * **Form 1: Views (from COMPONENT_SET with state variants)**
 * Has `views` object with state-specific display objects.
 * States: defaultView, hoverView, pressedView, disabledView.
 *
 * **Form 2: Image (from COMPONENT with children)**
 * Has `image` property — first child becomes the Button hit area.
 *
 * **Form 3: Flat (single component without children)**
 * Just `name` and `type`, potentially with `animation`.
 *
 * Consumed by `LayoutBuilder.buildComponent()` — Button-specific logic at lines 149–168.
 */
export interface ButtonConfig extends BaseProps, DisplayProps {
  type: 'Button';

  /**
   * Button state views (Form 1). Built from COMPONENT_SET with state=default/hover/pressed/disabled.
   * Each view is a complete display object config.
   */
  views?: {
    defaultView?: ChildConfig;
    hoverView?: ChildConfig;
    pressedView?: ChildConfig;
    disabledView?: ChildConfig;
  };

  /**
   * Button image/hit area (Form 2). The first child of a Button component.
   * Can be any display object (Sprite, SuperContainer, instance).
   */
  image?: ChildConfig;

  /** Children (Form 3 fallback). First child becomes image if no `image` property. */
  children?: ChildConfig[];

  /**
   * Enable press/hover animation.
   * - `true` → defaults to `{ hover: 1.03, press: 0.95, duration: 0.5 }` at runtime.
   * - Extracted from Figma component property "animation".
   */
  animation?: boolean;

  /** Initial disabled state. */
  disabled?: boolean;

  /** Button label text (extracted from Text child of default state). */
  text?: string;
  /** Style for the button label text. */
  textStyle?: TextStyle;

  /** Visual state variants (for non-state COMPONENT_SET, e.g. size variants). */
  variants?: VariantMap;
}

// --- Form Controls ---

/**
 * CheckBoxComponent — toggle/checkbox with two visual states.
 * Generated from Figma COMPONENT_SET with "Toggle" suffix and state=on/off variants.
 *
 * Consumed by `LayoutBuilder.buildComponent()` — CheckBox logic at lines 172–178.
 */
export interface CheckBoxConfig extends BaseProps, DisplayProps {
  type: 'CheckBoxComponent';
  /** Visual config for the checked (on) state. */
  checked?: ChildConfig;
  /** Visual config for the unchecked (off) state. */
  unchecked?: ChildConfig;
  /** Initial value. Set from instance's state component property. */
  value?: boolean;
}

/**
 * DotsGroup — page indicator dots (e.g. for carousels).
 * Generated from Figma component named exactly "DotsGroup" with "on"/"off" children.
 *
 * Consumed by `LayoutBuilder.buildDotsGroupLayout()`.
 */
export interface DotsGroupConfig extends BaseProps, DisplayProps {
  type: 'DotsGroup';
  /** Active dot template. Built at runtime via `buildLayoutChild()`. */
  on: ChildConfig;
  /** Inactive dot template. */
  off: ChildConfig;
  /** Spacing between dots (px). From Figma itemSpacing. */
  gap: number;
  /** Layout direction. From Figma layoutMode. */
  flow: 'horizontal' | 'vertical';
  /**
   * Number of dots. Set by LayoutBuilder via `size` property.
   * In config, this is the initial count from Figma children.
   */
  size?: number;
}

/**
 * RadioGroup — group of selectable items (on/off states).
 * Generated from Figma component named exactly "RadioGroup".
 *
 * At runtime, instances are scaled proportionally via `adjustRadioGroupInstance`.
 */
export interface RadioGroupConfig extends BaseProps, DisplayProps {
  type: 'RadioGroup';
  /** Active item template. Includes width/height for layout calculation. */
  on: ChildConfig & { width: number; height: number };
  /** Inactive item template. Includes width/height. */
  off: ChildConfig & { width: number; height: number };
  /** Number of items. From child count in Figma. */
  size: number;
  /** Spacing between items (px). From Figma itemSpacing, rounded. */
  elementsMargin: number;
  /** Layout direction. */
  flow: 'horizontal' | 'vertical';
}

/**
 * ScrollBox — scrollable container.
 * Generated from Figma component with "ScrollBox" suffix.
 *
 * Consumed by `LayoutBuilder.buildScrollBoxComponentLayout()`.
 * Children are added via `displayObject.addItem()` (not `addChild()`).
 */
export interface ScrollBoxConfig extends BaseProps, DisplayProps {
  type: 'ScrollBox';
  /** Viewport width (px). Always exported. */
  width: number;
  /** Viewport height (px). Always exported. */
  height: number;
  /** Scroll direction. From Figma layoutMode. Default: "vertical". */
  scrollType: 'vertical' | 'horizontal';
  /** Spacing between scrollable items (px). From Figma itemSpacing. Default: 0. */
  elementsMargin: number;
  /** Scrollable content items. */
  children?: ChildConfig[];
}

/**
 * ValueSlider — slider with value display.
 * Generated from Figma component with "ValueSlider" suffix.
 * Children typically include: ValueText, SliderBG, SliderFill, SliderBtn.
 *
 * Consumed by `LayoutBuilder.buildValueSliderLayout()` → `new Slider()`.
 */
export interface ValueSliderConfig extends BaseProps, DisplayProps {
  type: 'ValueSlider';
  /** Slider sub-components (bg, fill, handle, label). */
  children?: ChildConfig[];
}

/**
 * ScrollBar — scroll bar component.
 * Generated from Figma component with "ScrollBar" suffix.
 *
 * Consumed by `LayoutBuilder.buildScrollBarLayout()` → `new ScrollBar()`.
 */
export interface ScrollBarConfig extends BaseProps, DisplayProps {
  type: 'ScrollBar';
  /** ScrollBar sub-components. */
  children?: ChildConfig[];
}

/**
 * ProgressBar — progress/loader bar with bg and fill.
 * Generated from Figma component with "ProgressBar" suffix.
 * Extracts "bg" and "fill" named children and calculates fill padding.
 */
export interface ProgressBarConfig extends BaseProps, DisplayProps {
  type: 'ProgressBar';
  /** Background shape config (without position — always at 0,0). */
  bg?: ChildConfig;
  /** Fill shape config (without position). */
  fill?: ChildConfig;
  /** Padding of fill relative to bg (px). Calculated from child positions. */
  fillPaddings?: { left: number; top: number };
}

// --- Slot-Specific ---

/**
 * Reels — slot machine reels layout configuration.
 * Generated from Figma component named exactly "ReelsConfig".
 * Column-based structure: each column is a separate entity with its own position and row count.
 *
 * Consumed via `this.layouts.getConfig("ReelsConfig")` in ReelsScene.
 */
export interface ReelsConfig extends BaseProps, DisplayProps {
  type: 'Reels';

  /** Reels grid structure. */
  reels?: {
    /** X offset of the reels container (px). */
    x: number;
    /** Y offset of the reels container (px). */
    y: number;
    /** Width of a single symbol cell (px). From first cell of first column. */
    symbolWidth: number;
    /** Height of a single symbol cell (px). From first cell of first column. */
    symbolHeight: number;
    /** Number of visible rows (from first column). */
    rows: number;
    /** Column definitions. Sorted by X position. */
    columns: ReelColumn[];
  };

  /** Optional shadow overlay config. From child named "shadow". */
  shadow?: ChildConfig;
  /** Optional mask config. From child named "mask". */
  mask?: ChildConfig;
  /** Optional frame/border config. From child named "frame". */
  frame?: ChildConfig;
}

/** A single reel column in the ReelsConfig. */
export interface ReelColumn {
  /** X position of the column within the reels container (px). */
  x: number;
  /** Number of visible rows in this column (can differ for diamond-shaped grids). */
  rows: number;
  /** Column width (px). */
  width: number;
}

// --- Animation ---

/**
 * SpineAnimation — Spine skeleton animation instance.
 * Generated from Figma component named exactly "Spine".
 * Component properties are transformed into `params` by `postProcessSpine()`.
 */
export interface SpineAnimationConfig extends BaseProps, DisplayProps {
  type: 'SpineAnimation';
  /** Spine playback parameters. */
  params: SpineParams;
}

/** Spine animation parameters (resolved from Figma component properties). */
export interface SpineParams {
  /** Spine skeleton name (alias from assets/spine/). */
  spine: string;
  /** Animation name to play. */
  animation?: string;
  /** Auto-play animation on initialization. */
  autoPlay?: boolean;
  /** Loop the animation. */
  loop?: boolean;
  /** Spine skin name. */
  skin?: string;
}

// =============================================================================
// Variant System
// =============================================================================

/**
 * Variant map — keyed by variant identifier.
 *
 * Variant keys are built from Figma component variant properties:
 * - Single property: just the value (e.g. `"hover"`, `"3items"`).
 * - Multiple properties: sorted `key=value` pairs (e.g. `"size=large,state=active"`).
 *
 * Special case: if variant keys can't be uniquely determined,
 * falls back to `{ default: [...configs] }` (array).
 *
 * Each variant value contains the component config WITHOUT `name` and `type`
 * (those are at the parent level).
 */
export type VariantMap = Record<string, VariantConfig | VariantConfig[]>;

/**
 * A single variant's configuration.
 * Contains all the component's properties for that variant state.
 * `name` and `type` are NOT included (they're on the parent component).
 */
export interface VariantConfig {
  children?: ChildConfig[];
  /** Any display or component-specific properties. */
  [key: string]: any;
}

// =============================================================================
// Synthetic Elements (generated by export tool, not from Figma components)
// =============================================================================

/**
 * Synthetic mask — auto-generated for Figma FRAMEs with `clipContent: true`.
 * Injected as a child named "mask" if the frame doesn't already have a manual mask child.
 *
 * At runtime, `LayoutBuilder.#applyMaskFromChildren()` finds the child with
 * `label === "mask"` and sets it as the parent's display mask.
 */
export interface SyntheticMask {
  name: 'mask';
  type: 'Rectangle';
  x: 0;
  y: 0;
  width: number;
  height: number;
  style: {
    fill: '#ffffff';
    cornerRadius?: number | {
      topLeft: number;
      topRight: number;
      bottomRight: number;
      bottomLeft: number;
    };
  };
}
