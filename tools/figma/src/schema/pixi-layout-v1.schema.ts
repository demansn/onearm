/**
 * @fileoverview TypeScript schema for Pixi Layout v1 documents.
 *
 * Normative specification: `docs/pixi-layout-v1.md`
 *
 * This file is a typed reference for the Pixi Layout v1 format. The Markdown spec
 * is the source of truth for semantics; these interfaces provide compile-time types
 * for producers and consumers working in TypeScript. No runtime validation logic —
 * types only.
 *
 * Profiles covered:
 *   - Core    (Part I)   — a single `root` tree.
 *   - Library (Part II)  — `root` + reusable `prefabs`.
 *   - Scene   (Part III) — multiple named `scenes`, each with viewport-dependent modes.
 *
 * Extension mechanism (Part I §9) is orthogonal to profiles.
 */

// =============================================================================
// Document (top-level)
// =============================================================================

/**
 * A Pixi Layout v1 document. Discriminated by top-level shape:
 *  - {@link CoreDocument}    — `root` only.
 *  - {@link LibraryDocument} — `root` + `prefabs`.
 *  - {@link SceneDocument}   — `scenes` (optional `prefabs`), no `root`.
 *
 * See "Reader profile vs document shape" in the spec.
 */
export type PixiLayoutDocument = CoreDocument | LibraryDocument | SceneDocument;

/** Fields shared by every document envelope. See §2. */
export interface DocumentEnvelope {
    /** MUST be "pixi-layout". See §2. */
    format: "pixi-layout";
    /** MUST be 1 for this specification. See §2 and §2.2 evolution policy. */
    version: 1;
    /**
     * Optional explicit profile declaration. If present, a reader MUST verify
     * the document shape matches. See §2.1.
     */
    profile?: "core" | "library" | "scene";
    /** Extension identifiers referenced anywhere in the document. See §9.1. */
    extensionsUsed?: string[];
    /** Subset of `extensionsUsed` that a reader MUST support to load. See §9.1. */
    extensionsRequired?: string[];
    /** Document-scoped extension payloads keyed by identifier. See §9.1. */
    extensions?: Record<string, unknown>;
}

/**
 * Core-shape document: a single `root` tree. No prefabs, no scenes.
 *
 * Any Pixi.js application can load this in roughly 50 lines of reader code.
 * See Part I.
 */
export interface CoreDocument extends DocumentEnvelope {
    profile?: "core";
    /** Root of the node tree. See §3. */
    root: Node;
    prefabs?: never;
    scenes?: never;
}

/**
 * Library-shape document: `root` tree + reusable named prefab trees.
 * See Part II.
 */
export interface LibraryDocument extends DocumentEnvelope {
    profile?: "library";
    /** Root of the node tree. See §3. */
    root: Node;
    /** Prefab definitions keyed by name. See §12. */
    prefabs: Record<string, Node>;
    scenes?: never;
}

/**
 * Scene-shape document: `scenes` replaces `root`. Optional prefabs.
 * See Part III.
 */
export interface SceneDocument extends DocumentEnvelope {
    profile?: "scene";
    root?: never;
    /** Prefab definitions keyed by name. See §12. */
    prefabs?: Record<string, Node>;
    /** Scene definitions keyed by scene name. See §17. */
    scenes: Record<string, Scene>;
}

// =============================================================================
// Scene (Part III)
// =============================================================================

/** A named scene with one or more mode trees. See §17, §18. */
export interface Scene {
    /** Node trees keyed by mode name. MUST contain ≥1 key. See §18. */
    modes: Record<string, Node>;
    /** Producer-private payload. See §17. */
    extras?: Record<string, unknown>;
    /** Scene-scoped extension payloads keyed by identifier. See §9, §17. */
    extensions?: Record<string, unknown>;
}

// =============================================================================
// Node (union over all kinds)
// =============================================================================

/**
 * A node in a tree. Discriminated by `type` for intrinsic types.
 * Non-intrinsic types (prefab names, runtime-registered types) are covered by
 * {@link CustomNode}. See §3, §4, §5, §13.
 */
export type Node =
    | ContainerNode
    | SpriteNode
    | TextNode
    | GraphicsNode
    | SlotNode
    | SpineNode
    | CustomNode;

/** Set of intrinsic type names. See §4. */
export type IntrinsicType = "container" | "sprite" | "text" | "graphics" | "slot" | "spine";

/** Intrinsic-typed node union (excludes prefab refs and runtime-registered types). */
export type IntrinsicNode =
    | ContainerNode
    | SpriteNode
    | TextNode
    | GraphicsNode
    | SlotNode
    | SpineNode;

// =============================================================================
// Base node fields (shared by all node kinds)
// =============================================================================

/**
 * Fields common to every node. See §3.1.
 *
 * `id` and `type` are required; all other fields are optional with documented
 * defaults.
 */
export interface BaseNode {
    /** Technical identity, unique within the tree. See §3.2. */
    id: string;
    /** Discriminator: intrinsic name, prefab name, or runtime-registered name. */
    type: string;
    /** Semantic name for runtime queries. Not required to be unique. See §3.2. */
    label?: string;
    /** Local X position (default 0). */
    x?: number;
    /** Local Y position (default 0). */
    y?: number;
    /** Local X scale (default 1). */
    scaleX?: number;
    /** Local Y scale (default 1). */
    scaleY?: number;
    /** Local rotation in radians (default 0). */
    rotation?: number;
    /** Opacity in [0, 1] (default 1). */
    alpha?: number;
    /** Visibility (default true). */
    visible?: boolean;
    /** Display order hint (default 0). See §11 conformance MAY for sorting policy. */
    zIndex?: number;
    /** `id` of a node in the same tree used as mask source. See §8. */
    mask?: string;
    /** Producer-private payload. No declared contract. See §3.1. */
    extras?: Record<string, unknown>;
    /** Per-node extension payloads keyed by identifier. See §9.2. */
    extensions?: Record<string, unknown>;
}

// =============================================================================
// Intrinsic node types (§4)
// =============================================================================

/** A grouping node. The only composable intrinsic type in Core. See §4.1. */
export interface ContainerNode extends BaseNode {
    type: "container";
    /** Local pivot X (default 0). */
    pivotX?: number;
    /** Local pivot Y (default 0). */
    pivotY?: number;
    /** Child nodes, in z-order. See §3.5. */
    children?: Node[];
}

/**
 * A raster image node. There is no separate `image` intrinsic.
 * See §4.2.
 */
export interface SpriteNode extends BaseNode {
    type: "sprite";
    /** Opaque texture identifier. See §7. */
    texture: string;
    /** Optional atlas sub-frame identifier. */
    frame?: string;
    /** Optional tint. */
    tint?: string | number;
    /** Optional explicit display width. */
    width?: number;
    /** Optional explicit display height. */
    height?: number;
    /** Anchor X in [0, 1] (default 0). */
    anchorX?: number;
    /** Anchor Y in [0, 1] (default 0). */
    anchorY?: number;
    children?: never;
}

/**
 * Text style. Shape is intentionally unconstrained because Pixi.js text style
 * fields evolve across versions. Producers SHOULD prefer string identifiers
 * resolved by the runtime.
 */
export type TextStyle = string | Record<string, unknown>;

/** A text node. See §4.3. */
export interface TextNode extends BaseNode {
    type: "text";
    /** Text content. */
    text: string;
    /** Style identifier (preferred) or inline style object. */
    style?: TextStyle;
    /** Maximum display width constraint. */
    maxWidth?: number;
    /** Fit policy when `maxWidth` is set, e.g. "shrink". */
    fit?: string;
    /** Anchor X in [0, 1] (default 0). */
    anchorX?: number;
    /** Anchor Y in [0, 1] (default 0). */
    anchorY?: number;
    children?: never;
}

/** Shapes supported by the intrinsic `graphics` type. See §4.4. */
export type GraphicsShape = "rect" | "roundRect" | "circle" | "ellipse" | "polygon";

/**
 * Fill / stroke definition. Simple case is a hex-color string; objects are
 * extension territory. See §6 and §9 on extensibility.
 */
export type GraphicsPaint = string | Record<string, unknown>;

/**
 * A geometric shape node. May also serve as a mask source.
 * See §4.4 and §8.
 */
export interface GraphicsNode extends BaseNode {
    type: "graphics";
    shape: GraphicsShape;
    /** Required for `rect`, `roundRect`, `ellipse`. */
    width?: number;
    /** Required for `rect`, `roundRect`, `ellipse`. */
    height?: number;
    /** Required for `circle`; optional corner radius for `roundRect`. */
    radius?: number;
    /** Required for `polygon`. Flat array `[x0, y0, x1, y1, ...]`. */
    points?: number[];
    fill?: GraphicsPaint;
    stroke?: GraphicsPaint;
    strokeWidth?: number;
    children?: never;
}

/**
 * Named mount point for external content (another tree, a widget, or a
 * container constructed outside the layout document). See §4.5.
 */
export interface SlotNode extends BaseNode {
    type: "slot";
    /** Semantic mount point name. */
    slot: string;
    /** Slot area width. */
    width?: number;
    /** Slot area height. */
    height?: number;
    children?: never;
}

/** A Spine skeletal animation node. See §4.6. */
export interface SpineNode extends BaseNode {
    type: "spine";
    /** Opaque skeleton identifier. See §7. */
    skeleton: string;
    /** Initial skin name. */
    skin?: string;
    /** Default animation name. */
    animation?: string;
    children?: never;
}

// =============================================================================
// Custom node (prefab reference or runtime-registered type)
// =============================================================================

/**
 * A node whose `type` is not one of the intrinsic names. At load time a reader
 * resolves `type` against (in order): the document's `prefabs` map, then the
 * runtime type registry. See §5 and §13.
 *
 * Field constraints by resolution target:
 *  - **Prefab reference** — MUST NOT carry `props` or `children` (§13.1).
 *  - **Runtime-registered type** — MAY carry `props`; `children` semantics
 *    depend on the registered type.
 *
 * These distinctions are runtime-resolved and therefore not statically
 * enforceable in this type. Producers SHOULD validate accordingly.
 */
export interface CustomNode extends BaseNode {
    type: string;
    /** Construction parameters for runtime-registered types. See §5. */
    props?: Record<string, unknown>;
    /** Child nodes. Only meaningful for runtime-registered composable types. */
    children?: Node[];
}

// =============================================================================
// Type guards
// =============================================================================

const INTRINSIC_TYPE_NAMES: ReadonlySet<string> = new Set([
    "container",
    "sprite",
    "text",
    "graphics",
    "slot",
    "spine",
]);

/** Narrow a {@link Node} to an {@link IntrinsicNode}. */
export function isIntrinsicNode(node: Node): node is IntrinsicNode {
    return INTRINSIC_TYPE_NAMES.has(node.type);
}

/** True iff the document has `scenes`. */
export function isSceneDocument(doc: PixiLayoutDocument): doc is SceneDocument {
    return "scenes" in doc && doc.scenes !== undefined;
}

/** True iff the document has `prefabs` but no `scenes`. */
export function isLibraryDocument(doc: PixiLayoutDocument): doc is LibraryDocument {
    return !isSceneDocument(doc) && "prefabs" in doc && doc.prefabs !== undefined;
}

/** True iff the document has `root` only (no `prefabs`, no `scenes`). */
export function isCoreDocument(doc: PixiLayoutDocument): doc is CoreDocument {
    return !isSceneDocument(doc) && !isLibraryDocument(doc);
}

// =============================================================================
// Sanity examples (compile-time checks)
// =============================================================================

/* istanbul ignore next */
const _exampleCore: CoreDocument = {
    format: "pixi-layout",
    version: 1,
    root: {
        id: "root",
        type: "container",
        children: [{ id: "title", type: "text", text: "Hello" }],
    },
};

/* istanbul ignore next */
const _exampleLibrary: LibraryDocument = {
    format: "pixi-layout",
    version: 1,
    prefabs: {
        "Button.primary": {
            id: "root",
            type: "container",
            children: [
                { id: "bg", type: "sprite", texture: "btn_bg" },
                { id: "label", type: "text", text: "" },
            ],
        },
    },
    root: {
        id: "root",
        type: "container",
        children: [{ id: "playBtn", type: "Button.primary", x: 100, y: 50 }],
    },
};

/* istanbul ignore next */
const _exampleScene: SceneDocument = {
    format: "pixi-layout",
    version: 1,
    profile: "scene",
    extensionsUsed: ["VENDOR_physics"],
    prefabs: {
        "Slider.portrait": {
            id: "root",
            type: "container",
            children: [
                { id: "track", type: "sprite", texture: "slider_v" },
                { id: "thumb", type: "sprite", texture: "slider_thumb" },
            ],
        },
    },
    scenes: {
        Settings: {
            modes: {
                portrait: {
                    id: "root",
                    type: "container",
                    children: [
                        {
                            id: "title",
                            type: "text",
                            text: "Settings",
                            style: "h1",
                            x: 360,
                            y: 60,
                        },
                        { id: "volume", type: "Slider.portrait", x: 80, y: 900 },
                    ],
                },
            },
        },
    },
};

// Reference unused consts to keep them part of the compile surface.
void _exampleCore;
void _exampleLibrary;
void _exampleScene;
