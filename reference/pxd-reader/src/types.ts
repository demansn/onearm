/**
 * Vendored subset of the PXD v1 TypeScript schema.
 *
 * Normative: `docs/pxd-v1.md`
 * Canonical: `tools/figma/src/schema/pxd-v1.schema.ts`
 *
 * The reference reader vendors these types so it stays self-contained —
 * dropping the `reference/pxd-reader/` folder into any Pixi.js
 * project should work without the rest of the monorepo.
 */

export type PxdDocument = CoreDocument | LibraryDocument | SceneDocument;

export interface DocumentEnvelope {
    format: "pxd";
    version: 1;
    profile?: "core" | "library" | "scene";
    extensionsUsed?: string[];
    extensionsRequired?: string[];
    extensions?: Record<string, unknown>;
}

export interface CoreDocument extends DocumentEnvelope {
    profile?: "core";
    root: Node;
    prefabs?: never;
    scenes?: never;
}

export interface LibraryDocument extends DocumentEnvelope {
    profile?: "library";
    root: Node;
    prefabs: Record<string, Node>;
    scenes?: never;
}

export interface SceneDocument extends DocumentEnvelope {
    profile?: "scene";
    root?: never;
    prefabs?: Record<string, Node>;
    scenes: Record<string, Scene>;
}

export interface Scene {
    modes: Record<string, Node>;
    extensions?: Record<string, unknown>;
}

/**
 * §3.6 Decision map: a scalar field value selected at load time from an
 * "active tag set" supplied by the host. `"_"` is the default; every other
 * key is a `+`-joined, lexicographically-sorted tag selector.
 */
export interface DecisionMap<T extends number | string | boolean> {
    _: T;
    [selector: string]: T;
}

/** Field value that MAY be replaced by a decision map (§3.6). */
export type Decidable<T extends number | string | boolean> = T | DecisionMap<T>;

export interface BaseNode {
    /** Identity is static — never a decision value (§3.6). */
    id: string;
    /** Identity is static — never a decision value (§3.6). */
    type: string;
    label?: Decidable<string>;
    x?: Decidable<number>;
    y?: Decidable<number>;
    scaleX?: Decidable<number>;
    scaleY?: Decidable<number>;
    /** Local rotation in degrees; positive values rotate clockwise (§6). */
    rotation?: Decidable<number>;
    alpha?: Decidable<number>;
    visible?: Decidable<boolean>;
    zIndex?: Decidable<number>;
    /** Static — must resolve before mask forward-reference (§3.6). */
    mask?: string;
    extensions?: Record<string, unknown>;
}

export interface ContainerNode extends BaseNode {
    type: "container";
    pivotX?: Decidable<number>;
    pivotY?: Decidable<number>;
    children?: Node[];
}

export interface SpriteNode extends BaseNode {
    type: "sprite";
    texture: Decidable<string>;
    frame?: Decidable<string>;
    tint?: Decidable<string> | Decidable<number>;
    width?: Decidable<number>;
    height?: Decidable<number>;
    anchorX?: Decidable<number>;
    anchorY?: Decidable<number>;
    children?: never;
}

export interface TextNode extends BaseNode {
    type: "text";
    text: Decidable<string>;
    /** String form is Decidable; inline object form is NOT (§3.6 scope). */
    style?: Decidable<string> | Record<string, unknown>;
    maxWidth?: Decidable<number>;
    fit?: Decidable<string>;
    anchorX?: Decidable<number>;
    anchorY?: Decidable<number>;
    children?: never;
}

export type GraphicsShape = "rect" | "roundRect" | "circle" | "ellipse" | "polygon";

export interface GraphicsNode extends BaseNode {
    type: "graphics";
    shape: Decidable<GraphicsShape>;
    width?: Decidable<number>;
    height?: Decidable<number>;
    radius?: Decidable<number>;
    points?: number[];
    /** String form is Decidable; inline object form is NOT (§3.6 scope). */
    fill?: Decidable<string> | Record<string, unknown>;
    /** String form is Decidable; inline object form is NOT (§3.6 scope). */
    stroke?: Decidable<string> | Record<string, unknown>;
    strokeWidth?: Decidable<number>;
    children?: never;
}

export interface SlotNode extends BaseNode {
    type: "slot";
    slot: Decidable<string>;
    width?: Decidable<number>;
    height?: Decidable<number>;
    children?: never;
}

export interface SpineNode extends BaseNode {
    type: "spine";
    skeleton: Decidable<string>;
    skin?: Decidable<string>;
    animation?: Decidable<string>;
    children?: never;
}

export interface CustomNode extends BaseNode {
    type: string;
    props?: Record<string, unknown>;
    children?: never;
}

export type IntrinsicNode =
    | ContainerNode
    | SpriteNode
    | TextNode
    | GraphicsNode
    | SlotNode
    | SpineNode;

export type Node = IntrinsicNode | CustomNode;
