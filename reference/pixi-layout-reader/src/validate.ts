/**
 * Pixi Layout v1 validator.
 *
 * Covers validation rules across all three profiles (§10 Core, §15 Library,
 * §20 Scene). Reports the first violation with a rule reference suitable for
 * cross-referencing against `docs/pixi-layout-v1.md`.
 *
 * The reader (`core-reader.ts`) is Core-only and uses this validator in Core
 * mode; the validator itself is profile-agnostic so that the same module can
 * serve Library / Scene readers in the future.
 */

import type { PixiLayoutDocument } from "./types.js";

export class ValidationError extends Error {
    constructor(
        public readonly rule: string,
        message: string,
    ) {
        super(`[${rule}] ${message}`);
        this.name = "ValidationError";
    }
}

/** Intrinsic type names (§4). */
const INTRINSIC = new Set(["container", "sprite", "text", "graphics", "slot", "spine"]);
/** Intrinsic types that MUST NOT have children (§10 rule 8). */
const NON_COMPOSABLE = new Set(["sprite", "text", "graphics", "slot", "spine"]);
/** Node keys forbidden as decision-map targets (§3.6, §10 rule 14). */
const NON_DECIDABLE_NODE_KEYS = new Set([
    "id",
    "type",
    "mask",
    "children",
    "extensions",
    "props",
    "points",
]);

/**
 * Extension identifiers this reader implementation supports.
 * Used for §10 rule 16 enforcement (`extensionsRequired` ids must be recognized).
 */
export const SUPPORTED_EXTENSIONS: ReadonlySet<string> = new Set<string>();

function isObject(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
    return typeof v === "string" && v.length > 0;
}

type Shape = "core" | "library" | "scene";

function detectShape(doc: Record<string, unknown>): Shape {
    if ("scenes" in doc) return "scene";
    if ("prefabs" in doc) return "library";
    return "core";
}

export function validate(
    input: unknown,
    supportedExtensions: ReadonlySet<string> = SUPPORTED_EXTENSIONS,
): PixiLayoutDocument {
    if (!isObject(input)) throw new ValidationError("rule 1", "document must be an object");
    const doc = input;

    // §10 rule 1 — format
    if (doc.format !== "pixi-layout") {
        throw new ValidationError("rule 1", "format must be 'pixi-layout'");
    }
    // §10 rule 2 — version
    if (doc.version !== 1) {
        throw new ValidationError("rule 2", "version must be 1");
    }

    // §10 rules 15–16 — extensions
    const used = new Set(Array.isArray(doc.extensionsUsed) ? (doc.extensionsUsed as string[]) : []);
    const required = Array.isArray(doc.extensionsRequired) ? (doc.extensionsRequired as string[]) : [];
    for (const ext of required) {
        if (!used.has(ext)) {
            throw new ValidationError(
                "rule 15",
                `extensionsRequired contains '${ext}' not in extensionsUsed`,
            );
        }
        if (!supportedExtensions.has(ext)) {
            throw new ValidationError(
                "rule 16",
                `required extension '${ext}' is not supported by this reader`,
            );
        }
    }

    // §20 rule 28 — root and scenes are mutually exclusive
    const hasRoot = "root" in doc;
    const hasScenes = "scenes" in doc;
    if (hasRoot && hasScenes) {
        throw new ValidationError("rule 28", "document has both 'root' and 'scenes'");
    }

    const shape = detectShape(doc);

    // §2.1 / §10 rule 18 — profile matches shape
    if (typeof doc.profile === "string" && doc.profile !== shape) {
        throw new ValidationError(
            "rule 18",
            `profile '${doc.profile}' does not match document shape '${shape}'`,
        );
    }

    // Prefabs
    const prefabs = isObject(doc.prefabs) ? doc.prefabs : undefined;
    const prefabNames = prefabs ? new Set(Object.keys(prefabs)) : new Set<string>();

    if (prefabs) {
        for (const [name, tree] of Object.entries(prefabs)) {
            validateTree(tree, prefabNames, `prefab '${name}'`);
        }
        // §15 rule 21 — acyclic
        detectCycle(prefabs);
    }

    // Root
    if (shape === "core" || shape === "library") {
        if (!isObject(doc.root)) {
            throw new ValidationError("rule 3", "core/library documents MUST have an object 'root'");
        }
        validateTree(doc.root, prefabNames, "root");
    }

    // Scenes
    if (shape === "scene") {
        if (!isObject(doc.scenes)) {
            throw new ValidationError("rule 25", "scene documents MUST have an object 'scenes'");
        }
        const sceneEntries = Object.entries(doc.scenes);
        if (sceneEntries.length === 0) {
            throw new ValidationError("rule 25", "'scenes' MUST contain at least one scene");
        }
        for (const [sceneName, scene] of sceneEntries) {
            if (!isObject(scene)) {
                throw new ValidationError("rule 25", `scene '${sceneName}' must be an object`);
            }
            if (!isObject(scene.modes)) {
                throw new ValidationError("rule 26", `scene '${sceneName}' MUST have 'modes' object`);
            }
            const modeEntries = Object.entries(scene.modes);
            if (modeEntries.length === 0) {
                throw new ValidationError("rule 26", `scene '${sceneName}' has empty 'modes'`);
            }
            for (const [modeName, tree] of modeEntries) {
                validateTree(tree, prefabNames, `scene '${sceneName}' mode '${modeName}'`);
            }
        }
    }

    return doc as unknown as PixiLayoutDocument;
}

/** Validate a tree rooted at `root`. Checks ids, masks, composability, prefab refs. */
function validateTree(root: unknown, prefabNames: ReadonlySet<string>, context: string): void {
    const ids = new Set<string>();
    const masks: Array<{ nodeId: string; maskId: string }> = [];
    walk(root, ids, masks, prefabNames, context);
    // §10 rule 6 — mask refs resolve within the same tree
    for (const { nodeId, maskId } of masks) {
        if (!ids.has(maskId)) {
            throw new ValidationError(
                "rule 6",
                `mask '${maskId}' on node '${nodeId}' in ${context} not found in same tree`,
            );
        }
    }
}

function walk(
    node: unknown,
    ids: Set<string>,
    masks: Array<{ nodeId: string; maskId: string }>,
    prefabNames: ReadonlySet<string>,
    context: string,
): void {
    if (!isObject(node)) {
        throw new ValidationError("rule 4", `node in ${context} must be an object`);
    }
    // §10 rule 4 — id + type non-empty strings
    if (!isNonEmptyString(node.id)) {
        throw new ValidationError("rule 4", `node in ${context} must have non-empty string 'id'`);
    }
    if (!isNonEmptyString(node.type)) {
        throw new ValidationError("rule 4", `node '${node.id}' in ${context} must have non-empty string 'type'`);
    }
    // §10 rule 5 — unique ids within tree
    if (ids.has(node.id)) {
        throw new ValidationError("rule 5", `duplicate id '${node.id}' in ${context}`);
    }
    ids.add(node.id);

    // §10 rule 8 — non-composable intrinsic MUST NOT have children
    if (NON_COMPOSABLE.has(node.type) && node.children !== undefined) {
        throw new ValidationError(
            "rule 8",
            `intrinsic type '${node.type}' on node '${node.id}' must not have 'children'`,
        );
    }

    // §10 rules 11–14 — decision-map values
    validateDecisionMaps(node, context);

    // §10 rule 10 — intrinsic nodes MUST NOT have props (§5 rule 5)
    if (INTRINSIC.has(node.type) && node.props !== undefined) {
        throw new ValidationError(
            "rule 10",
            `intrinsic type '${node.type}' on node '${node.id}' must not have 'props'`,
        );
    }

    // §7 intrinsic field constraints
    validateIntrinsicFields(node);

    const isPrefabRef = !INTRINSIC.has(node.type) && prefabNames.has(node.type);
    const isRuntimeRef = !INTRINSIC.has(node.type) && !prefabNames.has(node.type);

    // §15 rule 19 — prefab references MUST NOT have props or children
    if (isPrefabRef) {
        if (node.props !== undefined) {
            throw new ValidationError(
                "rule 23",
                `prefab reference '${node.type}' on node '${node.id}' must not have 'props'`,
            );
        }
        if (node.children !== undefined) {
            throw new ValidationError(
                "rule 23",
                `prefab reference '${node.type}' on node '${node.id}' must not have 'children'`,
            );
        }
    }

    // §10 rule 9 — runtime-registered nodes MUST NOT have children (§3.5, §5 rule 4)
    if (isRuntimeRef && node.children !== undefined) {
        throw new ValidationError(
            "rule 9",
            `runtime-registered type '${node.type}' on node '${node.id}' must not have 'children'`,
        );
    }

    // mask — collect for post-walk check
    if (typeof node.mask === "string") {
        masks.push({ nodeId: node.id, maskId: node.mask });
    }

    // Recurse
    if (Array.isArray(node.children)) {
        for (const child of node.children) walk(child, ids, masks, prefabNames, context);
    }
}

/** §3.6 / §10 rules 11–14 — decision-map shape. */
function validateDecisionMaps(node: Record<string, unknown>, context: string): void {
    for (const [key, value] of Object.entries(node)) {
        if (NON_DECIDABLE_NODE_KEYS.has(key)) {
            // Rule 14 — decision values forbidden on these keys. If the field
            // value looks like a decision map (object with `_`), reject.
            if (
                typeof value === "object" &&
                value !== null &&
                !Array.isArray(value) &&
                "_" in (value as Record<string, unknown>)
            ) {
                throw new ValidationError(
                    "rule 14",
                    `field '${key}' on node '${node.id}' in ${context} may not be a decision map`,
                );
            }
            continue;
        }
        if (typeof value !== "object" || value === null || Array.isArray(value)) continue;
        const map = value as Record<string, unknown>;
        if (!("_" in map)) continue; // not a decision map — plain inline object

        // Rule 11 — has `_`
        // (presence already required by being treated as a decision map; the
        // failure path is "looked like one but `_` absent" — caught by !("_" in)).

        // Rule 13 — same primitive type across `_` and all selectors
        const defaultType = typeofPrimitive(map._);
        if (defaultType === null) {
            throw new ValidationError(
                "rule 13",
                `decision-map '_' on field '${key}' of node '${node.id}' must be a primitive (number, string, or boolean)`,
            );
        }

        for (const selector of Object.keys(map)) {
            if (selector === "_") continue;

            // Rule 12 — selector syntax
            if (selector.length === 0) {
                throw new ValidationError(
                    "rule 12",
                    `empty selector on field '${key}' of node '${node.id}'`,
                );
            }
            if (/\s/.test(selector)) {
                throw new ValidationError(
                    "rule 12",
                    `selector '${selector}' on field '${key}' of node '${node.id}' contains whitespace`,
                );
            }
            const tags = selector.split("+");
            if (tags.some((t) => t.length === 0)) {
                throw new ValidationError(
                    "rule 12",
                    `selector '${selector}' on field '${key}' of node '${node.id}' has empty tag segments`,
                );
            }
            // Rule 12 — lexicographic sort
            for (let i = 1; i < tags.length; i++) {
                if (tags[i - 1] >= tags[i]) {
                    throw new ValidationError(
                        "rule 12",
                        `selector '${selector}' on field '${key}' of node '${node.id}' is not lexicographically sorted`,
                    );
                }
            }
            // Rule 13 — value type matches default
            if (typeofPrimitive(map[selector]) !== defaultType) {
                throw new ValidationError(
                    "rule 13",
                    `decision-map on field '${key}' of node '${node.id}' has mixed value types`,
                );
            }
        }
    }
}

function typeofPrimitive(v: unknown): "number" | "string" | "boolean" | null {
    if (typeof v === "number") return "number";
    if (typeof v === "string") return "string";
    if (typeof v === "boolean") return "boolean";
    return null;
}

/** Accepts a literal string OR a decision map whose leaves are all strings. */
function isDecidableString(v: unknown): boolean {
    if (isNonEmptyString(v)) return true;
    if (isDecisionMapShape(v)) {
        const map = v as Record<string, unknown>;
        return Object.values(map).every((x) => typeof x === "string" && x.length > 0);
    }
    return false;
}

/** Accepts a literal number OR a decision map whose leaves are all numbers. */
function isDecidableNumber(v: unknown): boolean {
    if (typeof v === "number") return true;
    if (isDecisionMapShape(v)) {
        const map = v as Record<string, unknown>;
        return Object.values(map).every((x) => typeof x === "number");
    }
    return false;
}

function isDecidableStringValue(v: unknown): boolean {
    if (typeof v === "string") return true;
    if (isDecisionMapShape(v)) {
        const map = v as Record<string, unknown>;
        return Object.values(map).every((x) => typeof x === "string");
    }
    return false;
}

function isDecisionMapShape(v: unknown): boolean {
    return (
        typeof v === "object" &&
        v !== null &&
        !Array.isArray(v) &&
        "_" in (v as Record<string, unknown>)
    );
}

function validateIntrinsicFields(node: Record<string, unknown>): void {
    switch (node.type) {
        case "sprite":
            if (!isDecidableString(node.texture)) {
                throw new ValidationError("rule 7", `sprite node '${node.id}' must have string 'texture'`);
            }
            break;
        case "text":
            if (!isDecidableStringValue(node.text)) {
                throw new ValidationError("rule 7", `text node '${node.id}' must have string 'text'`);
            }
            break;
        case "graphics": {
            const shape = node.shape;
            const shapeIsString = typeof shape === "string" || isDecidableStringValue(shape);
            if (!shapeIsString) {
                throw new ValidationError("rule 7", `graphics node '${node.id}' must have 'shape'`);
            }
            // For shape-specific constraints (rect/roundRect/ellipse need width+height,
            // circle needs radius, polygon needs points), we can only validate when
            // `shape` is statically resolvable. If `shape` itself is a decision map,
            // we defer to runtime — a producer error there fails at draw time, not load.
            if (typeof shape === "string") {
                const needsSize = shape === "rect" || shape === "roundRect" || shape === "ellipse";
                if (needsSize) {
                    if (!isDecidableNumber(node.width) || !isDecidableNumber(node.height)) {
                        throw new ValidationError(
                            "rule 7",
                            `graphics node '${node.id}' with shape '${shape}' requires 'width' and 'height'`,
                        );
                    }
                }
                if (shape === "circle" && !isDecidableNumber(node.radius)) {
                    throw new ValidationError("rule 7", `graphics circle node '${node.id}' requires 'radius'`);
                }
                if (shape === "polygon" && !Array.isArray(node.points)) {
                    throw new ValidationError("rule 7", `graphics polygon node '${node.id}' requires 'points' array`);
                }
            }
            break;
        }
        case "slot":
            if (!isDecidableString(node.slot)) {
                throw new ValidationError("rule 7", `slot node '${node.id}' must have string 'slot'`);
            }
            break;
        case "spine":
            if (!isDecidableString(node.skeleton)) {
                throw new ValidationError("rule 7", `spine node '${node.id}' must have string 'skeleton'`);
            }
            break;
    }
}

/** DFS cycle detection over the prefab reference graph (§15 rule 21). */
function detectCycle(prefabs: Record<string, unknown>): void {
    const names = Object.keys(prefabs);
    const WHITE = 0,
        GRAY = 1,
        BLACK = 2;
    const color = new Map<string, number>();
    for (const n of names) color.set(n, WHITE);

    function visit(name: string, path: string[]): void {
        color.set(name, GRAY);
        for (const dep of collectTypeRefs(prefabs[name])) {
            if (!prefabs[dep]) continue;
            const c = color.get(dep);
            if (c === GRAY) {
                throw new ValidationError(
                    "rule 21",
                    `prefab cycle: ${[...path, name, dep].join(" -> ")}`,
                );
            }
            if (c === WHITE) visit(dep, [...path, name]);
        }
        color.set(name, BLACK);
    }

    for (const name of names) {
        if (color.get(name) === WHITE) visit(name, []);
    }
}

function collectTypeRefs(node: unknown): string[] {
    if (!isObject(node)) return [];
    const out: string[] = [];
    if (typeof node.type === "string" && !INTRINSIC.has(node.type)) {
        out.push(node.type);
    }
    if (Array.isArray(node.children)) {
        for (const c of node.children) out.push(...collectTypeRefs(c));
    }
    return out;
}

/** Utility for readers: extract shape without throwing on a validated doc. */
export function documentShape(doc: PixiLayoutDocument): Shape {
    return detectShape(doc as unknown as Record<string, unknown>);
}
