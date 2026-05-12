/**
 * @fileoverview TypeScript schema for PXD v1 documents.
 *
 * Normative specification: `docs/pxd-v1.md`
 *
 * This file is a typed reference for the PXD v1 format. The Markdown spec
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
 * A PXD v1 document. Discriminated by top-level shape:
 *  - {@link CoreDocument}    — `root` only.
 *  - {@link LibraryDocument} — `root` + `prefabs`.
 *  - {@link SceneDocument}   — `scenes` (optional `prefabs`), no `root`.
 *
 * See "Reader profile vs document shape" in the spec.
 */
export type PxdDocument = CoreDocument | LibraryDocument | SceneDocument;

/** Fields shared by every document envelope. See §2. */
export interface DocumentEnvelope {
    /** MUST be "pxd". See §2. */
    format: "pxd";
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
// Decision values (§3.6)
// =============================================================================

/**
 * Decision map: selects a scalar value at load time from a host-supplied
 * active tag set. `_` is the default; every other key is a `+`-joined,
 * lexicographically-sorted tag selector. See §3.6.
 */
export interface DecisionMap<T extends number | string | boolean> {
    _: T;
    [selector: string]: T;
}

/** Field value that MAY be replaced by a decision map (§3.6). */
export type Decidable<T extends number | string | boolean> = T | DecisionMap<T>;

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
    /** Technical identity, unique within the tree. Static — never Decidable. See §3.2. */
    id: string;
    /** Discriminator: intrinsic name, prefab name, or runtime-registered name. Static. */
    type: string;
    /** Semantic name for runtime queries. Not required to be unique. See §3.2. */
    label?: Decidable<string>;
    /** Local X position (default 0). */
    x?: Decidable<number>;
    /** Local Y position (default 0). */
    y?: Decidable<number>;
    /** Local X scale (default 1). */
    scaleX?: Decidable<number>;
    /** Local Y scale (default 1). */
    scaleY?: Decidable<number>;
    /** Local rotation in degrees (default 0); positive values rotate clockwise (§6). */
    rotation?: Decidable<number>;
    /** Opacity in [0, 1] (default 1). */
    alpha?: Decidable<number>;
    /** Visibility (default true). */
    visible?: Decidable<boolean>;
    /** Display order hint (default 0). See §11 conformance MAY for sorting policy. */
    zIndex?: Decidable<number>;
    /** `id` of a node in the same tree used as mask source. Static. See §8. */
    mask?: string;
    /** Per-node extension payloads keyed by identifier. See §9.2. */
    extensions?: Record<string, unknown>;
}

// =============================================================================
// Intrinsic node types (§4)
// =============================================================================

/** A grouping node. The only composable intrinsic type in Core. See §4.1. */
export interface ContainerNode extends BaseNode {
    type: "container";
    pivotX?: Decidable<number>;
    pivotY?: Decidable<number>;
    /** Child nodes, in z-order. Static structure. See §3.5. */
    children?: Node[];
}

/**
 * A raster image node. There is no separate `image` intrinsic.
 * See §4.2.
 */
export interface SpriteNode extends BaseNode {
    type: "sprite";
    /** Opaque texture identifier. See §7.1. May embed §7.2 bindings. */
    texture: Decidable<string>;
    frame?: Decidable<string>;
    tint?: Decidable<string> | Decidable<number>;
    width?: Decidable<number>;
    height?: Decidable<number>;
    anchorX?: Decidable<number>;
    anchorY?: Decidable<number>;
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
    text: Decidable<string>;
    /** Style identifier (Decidable) or inline style object (not Decidable per §3.6 scope). */
    style?: Decidable<string> | Record<string, unknown>;
    maxWidth?: Decidable<number>;
    fit?: Decidable<string>;
    anchorX?: Decidable<number>;
    anchorY?: Decidable<number>;
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
    shape: Decidable<GraphicsShape>;
    width?: Decidable<number>;
    height?: Decidable<number>;
    radius?: Decidable<number>;
    /** Required for `polygon`. Flat array `[x0, y0, x1, y1, ...]`. Not Decidable (array, §3.6 scope). */
    points?: number[];
    /** String form is Decidable; inline object form is not (§3.6 scope). */
    fill?: Decidable<string> | Record<string, unknown>;
    stroke?: Decidable<string> | Record<string, unknown>;
    strokeWidth?: Decidable<number>;
    children?: never;
}

/**
 * Named mount point for external content (another tree, a widget, or a
 * container constructed outside the layout document). See §4.5.
 */
export interface SlotNode extends BaseNode {
    type: "slot";
    slot: Decidable<string>;
    width?: Decidable<number>;
    height?: Decidable<number>;
    children?: never;
}

/** A Spine skeletal animation node. See §4.6. */
export interface SpineNode extends BaseNode {
    type: "spine";
    /** Opaque skeleton identifier. See §7.1. May embed §7.2 bindings. */
    skeleton: Decidable<string>;
    skin?: Decidable<string>;
    animation?: Decidable<string>;
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
 *  - **Runtime-registered type** — MAY carry `props`; MUST NOT carry `children`
 *    (§3.5, §5 rule 4). All inputs flow through `props`.
 */
export interface CustomNode extends BaseNode {
    type: string;
    /** Construction parameters for runtime-registered types. See §5. */
    props?: Record<string, unknown>;
    children?: never;
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
export function isSceneDocument(doc: PxdDocument): doc is SceneDocument {
    return "scenes" in doc && doc.scenes !== undefined;
}

/** True iff the document has `prefabs` but no `scenes`. */
export function isLibraryDocument(doc: PxdDocument): doc is LibraryDocument {
    return !isSceneDocument(doc) && "prefabs" in doc && doc.prefabs !== undefined;
}

/** True iff the document has `root` only (no `prefabs`, no `scenes`). */
export function isCoreDocument(doc: PxdDocument): doc is CoreDocument {
    return !isSceneDocument(doc) && !isLibraryDocument(doc);
}

// =============================================================================
// Sanity examples (compile-time checks)
// =============================================================================

/* istanbul ignore next */
const _exampleCore: CoreDocument = {
    format: "pxd",
    version: 1,
    root: {
        id: "root",
        type: "container",
        children: [{ id: "title", type: "text", text: "Hello" }],
    },
};

/* istanbul ignore next */
const _exampleLibrary: LibraryDocument = {
    format: "pxd",
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
    format: "pxd",
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
