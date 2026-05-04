/**
 * Vendored subset of the Pixi Layout v1 TypeScript schema.
 *
 * Normative: `docs/pixi-layout-v1.md`
 * Canonical: `tools/figma/src/schema/pixi-layout-v1.schema.ts`
 *
 * The reference reader vendors these types so it stays self-contained —
 * dropping the `reference/pixi-layout-reader/` folder into any Pixi.js
 * project should work without the rest of the monorepo.
 */

export type PixiLayoutDocument = CoreDocument | LibraryDocument | SceneDocument;

export interface DocumentEnvelope {
    format: "pixi-layout";
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
    extras?: Record<string, unknown>;
    extensions?: Record<string, unknown>;
}

export interface BaseNode {
    id: string;
    type: string;
    label?: string;
    x?: number;
    y?: number;
    scaleX?: number;
    scaleY?: number;
    rotation?: number;
    alpha?: number;
    visible?: boolean;
    zIndex?: number;
    mask?: string;
    extras?: Record<string, unknown>;
    extensions?: Record<string, unknown>;
}

export interface ContainerNode extends BaseNode {
    type: "container";
    pivotX?: number;
    pivotY?: number;
    children?: Node[];
}

export interface SpriteNode extends BaseNode {
    type: "sprite";
    texture: string;
    frame?: string;
    tint?: string | number;
    width?: number;
    height?: number;
    anchorX?: number;
    anchorY?: number;
    children?: never;
}

export interface TextNode extends BaseNode {
    type: "text";
    text: string;
    style?: string | Record<string, unknown>;
    maxWidth?: number;
    fit?: string;
    anchorX?: number;
    anchorY?: number;
    children?: never;
}

export type GraphicsShape = "rect" | "roundRect" | "circle" | "ellipse" | "polygon";

export interface GraphicsNode extends BaseNode {
    type: "graphics";
    shape: GraphicsShape;
    width?: number;
    height?: number;
    radius?: number;
    points?: number[];
    fill?: string | Record<string, unknown>;
    stroke?: string | Record<string, unknown>;
    strokeWidth?: number;
    children?: never;
}

export interface SlotNode extends BaseNode {
    type: "slot";
    slot: string;
    width?: number;
    height?: number;
    children?: never;
}

export interface SpineNode extends BaseNode {
    type: "spine";
    skeleton: string;
    skin?: string;
    animation?: string;
    children?: never;
}

export interface CustomNode extends BaseNode {
    type: string;
    props?: Record<string, unknown>;
    children?: Node[];
}

export type IntrinsicNode =
    | ContainerNode
    | SpriteNode
    | TextNode
    | GraphicsNode
    | SlotNode
    | SpineNode;

export type Node = IntrinsicNode | CustomNode;
