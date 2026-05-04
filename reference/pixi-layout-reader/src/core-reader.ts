/**
 * Pixi Layout v1 — Core profile reader (reference implementation).
 *
 * Normative spec: `docs/pixi-layout-v1.md` Part I.
 *
 * ## Architecture
 *
 * The reader is a small dispatcher plus a registry of per-type builders.
 *
 * Dispatch order per node:
 *   1. `builders.get(node.type)(node, ctx)` — construct the display object.
 *   2. `applyBaseFields(obj, node)` — transform, visibility, alpha, zIndex, label.
 *   3. `runExtensions(obj, node, ctx)` — run registered handlers for each
 *      `node.extensions[id]` in insertion order (matches `Object.keys`).
 *
 * Extension handlers receive the target AFTER base fields are applied, and MAY
 * override them if they need to.
 *
 * ## Adding types
 *
 * Pass `options.builders` to register additional type names. Entries override
 * defaults on key collision. Default registry covers `container`, `sprite`,
 * `text`, `graphics`, `slot`. Other ecosystem types (including intrinsic ones
 * that the spec lists as MAY) are not shipped — register them explicitly.
 *
 * ## Adding extensions
 *
 * Pass `options.extensions` keyed by extension identifier. Handlers receive
 * `(payload, target, node, ctx)`. Unregistered extensions listed only in the
 * document's `extensionsUsed` are silently ignored, per spec §9.3.
 *
 * ## Scope
 *
 * - Core profile only. Library / Scene documents are rejected with an error.
 * - Document-level `extensions` (root) are ignored by this reader — asset /
 *   resource loading is the caller's concern.
 */

import { Container, Graphics, Sprite, Text, type Texture } from "pixi.js";
import type {
    ContainerNode,
    CoreDocument,
    GraphicsNode,
    Node,
    SpriteNode,
    TextNode,
} from "./types.js";
import { documentShape, validate } from "./validate.js";

// =============================================================================
// Public types
// =============================================================================

export interface Resolvers {
    /** Resolve an opaque texture identifier (§7) to a Pixi Texture. */
    texture: (id: string) => Texture;
    /** Resolve a text style identifier. Return `undefined` for unknown ids. */
    style?: (id: string) => object | undefined;
}

export type NodeBuilder = (node: Node, ctx: BuildContext) => Container;

/**
 * Extension handler. Receives the already-built target with base fields
 * applied. MAY mutate the target (including overriding base fields).
 */
export type ExtensionHandler = (
    payload: unknown,
    target: Container,
    node: Node,
    ctx: BuildContext,
) => void;

export interface BuildContext {
    resolve: Resolvers;
    builders: ReadonlyMap<string, NodeBuilder>;
    extensions: ReadonlyMap<string, ExtensionHandler>;
    /** Recursively build a child node (applies the full dispatch pipeline). */
    buildChild: (child: Node) => Container;
    /** Register a mask binding. Resolved after the full tree is built. */
    registerMask: (target: Container, maskId: string) => void;
}

export interface CoreReaderOptions {
    resolve: Resolvers;
    /** Additional builders merged onto {@link defaultBuilders}. Keys override defaults. */
    builders?: ReadonlyMap<string, NodeBuilder>;
    /** Extension handlers keyed by extension identifier. */
    extensions?: ReadonlyMap<string, ExtensionHandler>;
}

// =============================================================================
// Default builders
// =============================================================================

export function buildContainerNode(node: Node, ctx: BuildContext): Container {
    const c = node as ContainerNode;
    const obj = new Container();
    if (c.pivotX !== undefined) obj.pivot.x = c.pivotX;
    if (c.pivotY !== undefined) obj.pivot.y = c.pivotY;
    if (c.children) {
        for (const child of c.children) obj.addChild(ctx.buildChild(child));
    }
    return obj;
}

export function buildSpriteNode(node: Node, ctx: BuildContext): Container {
    const s = node as SpriteNode;
    const sprite = new Sprite(ctx.resolve.texture(s.texture));
    if (s.width !== undefined) sprite.width = s.width;
    if (s.height !== undefined) sprite.height = s.height;
    if (s.anchorX !== undefined || s.anchorY !== undefined) {
        sprite.anchor.set(s.anchorX ?? 0, s.anchorY ?? 0);
    }
    if (s.tint !== undefined) sprite.tint = s.tint as number;
    return sprite;
}

export function buildTextNode(node: Node, ctx: BuildContext): Container {
    const t = node as TextNode;
    const style = typeof t.style === "string" ? ctx.resolve.style?.(t.style) : t.style;
    const text = new Text({ text: t.text, style: style as object | undefined });
    if (t.anchorX !== undefined || t.anchorY !== undefined) {
        text.anchor.set(t.anchorX ?? 0, t.anchorY ?? 0);
    }
    if (t.maxWidth !== undefined) text.style.wordWrapWidth = t.maxWidth;
    return text;
}

export function buildGraphicsNode(node: Node, _ctx: BuildContext): Container {
    const g = new Graphics();
    drawShape(g, node as GraphicsNode);
    return g;
}

export function buildSlotNode(_node: Node, _ctx: BuildContext): Container {
    // A slot is a passive named mount point. The caller attaches external content.
    return new Container();
}

/** Default builder registry: container, sprite, text, graphics, slot. */
export const defaultBuilders: ReadonlyMap<string, NodeBuilder> = new Map<string, NodeBuilder>([
    ["container", buildContainerNode],
    ["sprite", buildSpriteNode],
    ["text", buildTextNode],
    ["graphics", buildGraphicsNode],
    ["slot", buildSlotNode],
]);

// =============================================================================
// Dispatcher
// =============================================================================

/**
 * Build a single tree scope into a Pixi display tree.
 *
 * Creates its own `idMap` and `pendingMasks`; resolves mask forward-references
 * at the end. Used by {@link readCoreDocument} for the root tree, and by
 * richer readers (e.g. Library) for each prefab instance — every call is a
 * fresh identity scope (§13.2).
 *
 * This helper does not validate the input or check profile shape; callers are
 * responsible for that. It accepts a single `Node` (the root of the tree to
 * build) plus the standard `CoreReaderOptions`.
 */
export function buildSubtree(root: Node, options: CoreReaderOptions): Container {
    const builders = new Map(defaultBuilders);
    if (options.builders) for (const [k, v] of options.builders) builders.set(k, v);
    const extensions: ReadonlyMap<string, ExtensionHandler> =
        options.extensions ?? new Map<string, ExtensionHandler>();

    const idMap = new Map<string, Container>();
    const pendingMasks: Array<[Container, string]> = [];

    const ctx: BuildContext = {
        resolve: options.resolve,
        builders,
        extensions,
        buildChild: (child) => buildNode(child, ctx, idMap),
        registerMask: (target, maskId) => pendingMasks.push([target, maskId]),
    };

    const out = buildNode(root, ctx, idMap);

    for (const [target, maskId] of pendingMasks) {
        const mask = idMap.get(maskId);
        if (!mask) throw new Error(`mask '${maskId}' not found`);
        target.mask = mask;
    }
    return out;
}

/** Validates and builds a core-shape document into a Pixi display tree. */
export function readCoreDocument(input: unknown, options: CoreReaderOptions): Container {
    const doc = validate(input);
    const shape = documentShape(doc);
    if (shape !== "core") {
        throw new Error(
            `Core reader only supports core-shape documents, got ${shape}-shape. ` +
                `Use a Library or Scene reader for that document.`,
        );
    }
    return buildSubtree((doc as CoreDocument).root, options);
}

function buildNode(node: Node, ctx: BuildContext, idMap: Map<string, Container>): Container {
    const builder = ctx.builders.get(node.type);
    if (!builder) {
        throw new Error(`no builder registered for type '${node.type}' on node '${node.id}'`);
    }
    const obj = builder(node, ctx);
    applyBaseFields(obj, node);
    runExtensions(obj, node, ctx);
    idMap.set(node.id, obj);
    if (typeof node.mask === "string") ctx.registerMask(obj, node.mask);
    return obj;
}

function applyBaseFields(obj: Container, node: Node): void {
    obj.label = node.id;
    if (node.x !== undefined) obj.x = node.x;
    if (node.y !== undefined) obj.y = node.y;
    if (node.scaleX !== undefined) obj.scale.x = node.scaleX;
    if (node.scaleY !== undefined) obj.scale.y = node.scaleY;
    if (node.rotation !== undefined) obj.rotation = node.rotation;
    if (node.alpha !== undefined) obj.alpha = node.alpha;
    if (node.visible !== undefined) obj.visible = node.visible;
    if (node.zIndex !== undefined) obj.zIndex = node.zIndex;
}

function runExtensions(target: Container, node: Node, ctx: BuildContext): void {
    if (!node.extensions) return;
    for (const [id, payload] of Object.entries(node.extensions)) {
        const handler = ctx.extensions.get(id);
        if (handler) handler(payload, target, node, ctx);
        // else: silently ignore per spec §9.3
    }
}

function drawShape(g: Graphics, node: GraphicsNode): void {
    switch (node.shape) {
        case "rect":
            g.rect(0, 0, node.width!, node.height!);
            break;
        case "roundRect":
            g.roundRect(0, 0, node.width!, node.height!, node.radius ?? 0);
            break;
        case "circle":
            g.circle(0, 0, node.radius!);
            break;
        case "ellipse":
            g.ellipse(0, 0, node.width! / 2, node.height! / 2);
            break;
        case "polygon":
            g.poly(node.points!);
            break;
    }
    if (node.fill !== undefined) g.fill(node.fill as string);
    if (node.stroke !== undefined) {
        g.stroke({ color: node.stroke as string, width: node.strokeWidth ?? 1 });
    }
}
