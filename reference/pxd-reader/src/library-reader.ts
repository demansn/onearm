/**
 * PXD v1 — Library profile reader (reference implementation).
 *
 * Normative spec: `docs/pxd-v1.md` Part II.
 *
 * Library = Core + reusable named trees (`prefabs`). A node whose `type`
 * matches a prefab name instantiates that prefab tree in a fresh identity
 * scope (§13.2).
 *
 * ## Architecture
 *
 * Each prefab is registered as a {@link NodeBuilder} that calls
 * {@link buildSubtree} on the prefab body. Because `buildSubtree` creates its
 * own `idMap` and `pendingMasks`, every instance gets an isolated scope — ids
 * inside one instance do not collide with ids in another instance, and masks
 * inside a prefab resolve locally.
 *
 * Transitive composition works because every prefab builder closes over the
 * **same** `finalOptions.builders` Map. By the time any builder is called, the
 * Map contains every registered prefab, so prefab-to-prefab references
 * resolve correctly.
 *
 * The reference node's base fields and extensions are applied AFTER the
 * prefab body is built (standard Core dispatch order). The ref node's fields
 * therefore override any corresponding fields on the prefab root. Extensions
 * on the prefab root run during `buildSubtree` (inner scope) and extensions
 * on the ref run after (outer scope) — both execute.
 *
 * ## Scope
 *
 * - Accepts core-shape and library-shape documents.
 * - Rejects scene-shape documents with a clear error.
 * - Defensive check: prefab names MUST NOT collide with intrinsic type names
 *   (§12.1). The current validator does not enforce this; we guard at the
 *   reader boundary to prevent silent default-builder corruption.
 */

import type { Container } from "pixi.js";
import {
    buildSubtree,
    defaultBuilders,
    type CoreReaderOptions,
    type NodeBuilder,
} from "./core-reader.js";
import type { LibraryDocument, Node } from "./types.js";
import { documentShape, validate } from "./validate.js";

/** Options for {@link readLibraryDocument}. Currently identical to Core. */
export type LibraryReaderOptions = CoreReaderOptions;

/**
 * Validates and builds a core-shape OR library-shape document into a Pixi
 * display tree. Rejects scene-shape documents.
 */
export function readLibraryDocument(
    input: unknown,
    options: LibraryReaderOptions,
): Container {
    const doc = validate(input);
    const shape = documentShape(doc);
    if (shape === "scene") {
        throw new Error(
            "Library reader only supports core-shape and library-shape documents, " +
                "got scene-shape. Use a Scene reader for that document.",
        );
    }

    const prefabs = (doc as { prefabs?: Record<string, Node> }).prefabs ?? {};

    // Single merged builder registry: defaults + user-provided + prefab-generated.
    // We hold a shared mutable reference so prefab builders closed over
    // `finalOptions` see every registered prefab at call time — enabling
    // transitive prefab → prefab composition.
    const builders = new Map(defaultBuilders);
    if (options.builders) for (const [k, v] of options.builders) builders.set(k, v);

    // §12.1 defensive guard: prefab names MUST NOT collide with any registered
    // builder (intrinsic defaults OR user-provided). The validator doesn't
    // enforce this yet; without this check, a prefab could silently override a
    // default or a user-provided builder.
    for (const name of Object.keys(prefabs)) {
        if (builders.has(name)) {
            throw new Error(
                `prefab name '${name}' collides with registered type (§12.1)`,
            );
        }
    }

    const finalOptions: CoreReaderOptions = {
        resolve: options.resolve,
        extensions: options.extensions,
        builders,
    };

    for (const [name, body] of Object.entries(prefabs)) {
        const prefabBuilder: NodeBuilder = () => buildSubtree(body, finalOptions);
        builders.set(name, prefabBuilder);
    }

    const root = (doc as LibraryDocument).root;
    return buildSubtree(root, finalOptions);
}
