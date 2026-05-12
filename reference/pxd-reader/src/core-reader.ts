/**
 * PXD v1 — Core profile reader (reference implementation).
 *
 * Normative spec: `docs/pxd-v1.md` Part I.
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
    CoreDocument,
    Decidable,
    DecisionMap,
    GraphicsShape,
    Node,
} from "./types.js";
import { documentShape, validate } from "./validate.js";

/**
 * Post-§3.6 view of a node — every Decidable<T> field is collapsed to its
 * picked leaf T. Builders receive nodes of this shape, never raw Decidable.
 */
type Unwrap<T> = T extends DecisionMap<infer U>
    ? U
    : T extends Decidable<infer U>
    ? U
    : T;
type Resolved<N> = { [K in keyof N]: Unwrap<N[K]> };

/** Builder-facing node variants (post-decision-resolution). */
interface ResolvedContainerNode { type: "container"; id: string; pivotX?: number; pivotY?: number; children?: Node[] }
interface ResolvedSpriteNode { type: "sprite"; id: string; texture: string; frame?: string; tint?: string | number; width?: number; height?: number; anchorX?: number; anchorY?: number }
interface ResolvedTextNode { type: "text"; id: string; text: string; style?: string | Record<string, unknown>; maxWidth?: number; fit?: string; anchorX?: number; anchorY?: number }
interface ResolvedGraphicsNode { type: "graphics"; id: string; shape: GraphicsShape; width?: number; height?: number; radius?: number; points?: number[]; fill?: string | Record<string, unknown>; stroke?: string | Record<string, unknown>; strokeWidth?: number }
type ResolvedBaseFields = Resolved<{ x?: Decidable<number>; y?: Decidable<number>; scaleX?: Decidable<number>; scaleY?: Decidable<number>; rotation?: Decidable<number>; alpha?: Decidable<number>; visible?: Decidable<boolean>; zIndex?: Decidable<number>; mask?: string }>;

// =============================================================================
// Public types
// =============================================================================

export interface Resolvers {
    /** Resolve an opaque texture identifier (§7.1) to a Pixi Texture. */
    texture: (id: string) => Texture;
    /** Resolve a text style identifier. Return `undefined` for unknown ids. */
    style?: (id: string) => object | undefined;
    /**
     * Resolve a binding path (§7.2). Receives the raw `path` between `{` and `}`
     * (escapes already stripped) and returns the substituted string. If absent,
     * any `{...}` substring in document strings is passed through unchanged.
     */
    binding?: (path: string) => string;
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
    /** Active tag set for §3.6 decision resolution. */
    activeTags: ReadonlySet<string>;
    /** Recursively build a child node (applies the full dispatch pipeline). */
    buildChild: (child: Node) => Container;
    /** Register a mask binding. Resolved after the full tree is built. */
    registerMask: (target: Container, maskId: string) => void;
    /**
     * Apply §7.2 string bindings. Pass any document string through this before
     * using it as a typed identifier (texture id, style id, raw text). When no
     * binding resolver is registered and no `{...}` syntax is present, this is
     * a no-op. Builders SHOULD call this on every string field they consume.
     */
    readString: (value: string) => string;
}

export interface CoreReaderOptions {
    resolve: Resolvers;
    /** Additional builders merged onto {@link defaultBuilders}. Keys override defaults. */
    builders?: ReadonlyMap<string, NodeBuilder>;
    /** Extension handlers keyed by extension identifier. */
    extensions?: ReadonlyMap<string, ExtensionHandler>;
    /**
     * §3.6 active tag set. Decision-map values are resolved against this set
     * before any other field processing. Defaults to empty (always picks `_`).
     */
    activeTags?: Iterable<string>;
}

// =============================================================================
// Default builders
// =============================================================================

export function buildContainerNode(node: Node, ctx: BuildContext): Container {
    const c = node as unknown as ResolvedContainerNode;
    const obj = new Container();
    if (c.pivotX !== undefined) obj.pivot.x = c.pivotX;
    if (c.pivotY !== undefined) obj.pivot.y = c.pivotY;
    if (c.children) {
        for (const child of c.children) obj.addChild(ctx.buildChild(child));
    }
    return obj;
}

export function buildSpriteNode(node: Node, ctx: BuildContext): Container {
    const s = node as unknown as ResolvedSpriteNode;
    const sprite = new Sprite(ctx.resolve.texture(ctx.readString(s.texture)));
    if (s.width !== undefined) sprite.width = s.width;
    if (s.height !== undefined) sprite.height = s.height;
    if (s.anchorX !== undefined || s.anchorY !== undefined) {
        sprite.anchor.set(s.anchorX ?? 0, s.anchorY ?? 0);
    }
    if (s.tint !== undefined) sprite.tint = s.tint as number;
    return sprite;
}

export function buildTextNode(node: Node, ctx: BuildContext): Container {
    const t = node as unknown as ResolvedTextNode;
    const style =
        typeof t.style === "string"
            ? ctx.resolve.style?.(ctx.readString(t.style))
            : t.style;
    const text = new Text({ text: ctx.readString(t.text), style: style as object | undefined });
    if (t.anchorX !== undefined || t.anchorY !== undefined) {
        text.anchor.set(t.anchorX ?? 0, t.anchorY ?? 0);
    }
    if (t.maxWidth !== undefined) text.style.wordWrapWidth = t.maxWidth;
    return text;
}

export function buildGraphicsNode(node: Node, ctx: BuildContext): Container {
    const g = new Graphics();
    drawShape(g, node as unknown as ResolvedGraphicsNode, ctx);
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
    const activeTags: ReadonlySet<string> = new Set(options.activeTags ?? []);

    const idMap = new Map<string, Container>();
    const pendingMasks: Array<[Container, string]> = [];
    const bindingResolver = options.resolve.binding;
    const readString = bindingResolver
        ? (value: string) => resolveBindings(value, bindingResolver)
        : (value: string) => (BINDING_OR_ESCAPE.test(value) ? resolveBindings(value, passthrough) : value);

    const ctx: BuildContext = {
        resolve: options.resolve,
        builders,
        extensions,
        activeTags,
        buildChild: (child) => buildNode(child, ctx, idMap),
        registerMask: (target, maskId) => pendingMasks.push([target, maskId]),
        readString,
    };

    const out = buildNode(root, ctx, idMap);

    for (const [target, maskId] of pendingMasks) {
        const mask = idMap.get(maskId);
        if (!mask) throw new Error(`mask '${maskId}' not found`);
        target.mask = mask;
    }
    return out;
}

/** Keys of a node that MUST NOT be replaced by a decision value (§3.6). */
const NON_DECIDABLE_KEYS: ReadonlySet<string> = new Set([
    "id",
    "type",
    "mask",
    "children",
    "extensions",
    "props",
    "points", // graphics polygon array — structural, not a scalar
]);

/**
 * §3.6 decision-value resolver. Picks the most-specific selector that matches
 * the active tag set, breaking ties by declaration order. Throws on an
 * unsorted selector; spec §3.6 requires producers to canonicalize.
 *
 * Exported for tests; node-wide field resolution is normally driven by
 * {@link resolveNodeFields}.
 */
export function resolveDecisionValue(value: unknown, activeTags: ReadonlySet<string>): unknown {
    if (!isDecisionMap(value)) return value;
    const map = value as Record<string, unknown>;
    let pickedKey = "_";
    let pickedSpec = -1;
    for (const key of Object.keys(map)) {
        if (key === "_") continue;
        const tags = key.split("+");
        // §3.6 canonical-order check
        for (let i = 1; i < tags.length; i++) {
            if (tags[i - 1] >= tags[i]) {
                throw new Error(
                    `decision-map selector '${key}' is not lexicographically sorted (§3.6)`,
                );
            }
        }
        let allActive = true;
        for (const t of tags) {
            if (!activeTags.has(t)) {
                allActive = false;
                break;
            }
        }
        if (!allActive) continue;
        // Strict `>` preserves declaration order on ties (first match wins).
        if (tags.length > pickedSpec) {
            pickedSpec = tags.length;
            pickedKey = key;
        }
    }
    return map[pickedKey];
}

function isDecisionMap(v: unknown): boolean {
    return typeof v === "object" && v !== null && !Array.isArray(v) && "_" in v;
}

/**
 * Returns a copy of `node` with all decidable scalar fields resolved against
 * `activeTags`. Structural fields (id, type, mask, children, extensions,
 * props, points) are passed through unchanged.
 */
function resolveNodeFields(node: Node, activeTags: ReadonlySet<string>): Node {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
        out[key] = NON_DECIDABLE_KEYS.has(key)
            ? value
            : resolveDecisionValue(value, activeTags);
    }
    return out as unknown as Node;
}

/**
 * §7.2 binding resolver. Walks `value` once, expanding `{path}` via `resolve`
 * and honoring `\{` / `\\` escapes. Substituted values are NOT re-scanned.
 *
 * Exported for tests; builders should normally use `ctx.readString` instead.
 */
export function resolveBindings(value: string, resolve: (path: string) => string): string {
    if (!BINDING_OR_ESCAPE.test(value)) return value;
    let out = "";
    let i = 0;
    while (i < value.length) {
        const ch = value[i];
        if (ch === "\\" && i + 1 < value.length) {
            const next = value[i + 1];
            if (next === "{" || next === "\\") {
                out += next;
                i += 2;
                continue;
            }
        }
        if (ch === "{") {
            const end = value.indexOf("}", i + 1);
            if (end === -1) {
                throw new Error(`unterminated binding starting at index ${i} in '${value}'`);
            }
            const path = value.slice(i + 1, end);
            if (path.length === 0) {
                throw new Error(`empty binding '{}' at index ${i} in '${value}'`);
            }
            out += resolve(path);
            i = end + 1;
            continue;
        }
        out += ch;
        i++;
    }
    return out;
}

const BINDING_OR_ESCAPE = /[{\\]/;
const passthrough = (path: string): string => `{${path}}`;

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
    // §3.6 — substitute every decision-map value to its picked leaf BEFORE
    // dispatch and field application. Builders see only resolved scalars.
    const resolved = resolveNodeFields(node, ctx.activeTags);
    const builder = ctx.builders.get(resolved.type);
    if (!builder) {
        throw new Error(`no builder registered for type '${resolved.type}' on node '${resolved.id}'`);
    }
    const obj = builder(resolved, ctx);
    applyBaseFields(obj, resolved);
    runExtensions(obj, resolved, ctx);
    idMap.set(resolved.id, obj);
    if (typeof resolved.mask === "string") ctx.registerMask(obj, resolved.mask);
    return obj;
}

const DEG_TO_RAD = Math.PI / 180;

function applyBaseFields(obj: Container, node: Node): void {
    const n = node as unknown as ResolvedBaseFields & { id: string };
    obj.label = n.id;
    if (n.x !== undefined) obj.x = n.x;
    if (n.y !== undefined) obj.y = n.y;
    if (n.scaleX !== undefined) obj.scale.x = n.scaleX;
    if (n.scaleY !== undefined) obj.scale.y = n.scaleY;
    // §6: rotation is in degrees; convert to radians for Pixi.
    if (n.rotation !== undefined) obj.rotation = n.rotation * DEG_TO_RAD;
    if (n.alpha !== undefined) obj.alpha = n.alpha;
    if (n.visible !== undefined) obj.visible = n.visible;
    if (n.zIndex !== undefined) obj.zIndex = n.zIndex;
}

function runExtensions(target: Container, node: Node, ctx: BuildContext): void {
    if (!node.extensions) return;
    for (const [id, payload] of Object.entries(node.extensions)) {
        const handler = ctx.extensions.get(id);
        if (handler) handler(payload, target, node, ctx);
        // else: silently ignore per spec §9.3
    }
}

function drawShape(g: Graphics, node: ResolvedGraphicsNode, ctx: BuildContext): void {
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
    if (node.fill !== undefined) {
        g.fill(typeof node.fill === "string" ? ctx.readString(node.fill) : (node.fill as object));
    }
    if (node.stroke !== undefined) {
        const strokeWidth = node.strokeWidth ?? 1;
        const stroke = typeof node.stroke === "string"
            ? { color: ctx.readString(node.stroke), width: strokeWidth }
            : { ...(node.stroke as object), width: strokeWidth };
        g.stroke(stroke);
    }
}
