/**
 * Runtime tests for the Library profile reader.
 *
 * Uses `node:test` and `node:assert/strict`. Loads fixtures from
 * `docs/fixtures/pixi-layout-v1/` for the positive cases; uses inline
 * documents for edge cases.
 *
 * Sprite and Text intrinsic types are stubbed with Container to avoid
 * browser-only dependencies (texture loading, canvas text measurement).
 * Library semantics — prefab instantiation, scope isolation, transitive
 * composition — are orthogonal to rendering, so stubs do not weaken tests.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { Container } from "pixi.js";

import { type NodeBuilder } from "../src/core-reader.js";
import { readLibraryDocument } from "../src/library-reader.js";

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(here, "../../../../docs/fixtures/pixi-layout-v1");

function loadFixture(relPath: string): unknown {
    return JSON.parse(readFileSync(`${FIXTURES}/${relPath}`, "utf8"));
}

/** Stub builders for leaf intrinsic types that Node can't instantiate directly. */
const leafStubs: ReadonlyMap<string, NodeBuilder> = new Map<string, NodeBuilder>([
    ["sprite", () => new Container()],
    ["text", () => new Container()],
]);

const baseOptions = {
    resolve: { texture: () => ({}) as never },
    builders: leafStubs,
};

/** Recursively find a descendant by label. */
function findByLabel(root: Container, label: string): Container | null {
    if (root.label === label) return root;
    for (const child of root.children) {
        if (child instanceof Container) {
            const hit = findByLabel(child, label);
            if (hit) return hit;
        }
    }
    return null;
}

test("library-simple: prefab instantiated at each reference site", () => {
    const doc = loadFixture("valid/library-simple.json");
    const root = readLibraryDocument(doc, baseOptions);

    const playBtn = findByLabel(root, "playBtn");
    const quitBtn = findByLabel(root, "quitBtn");
    assert.ok(playBtn, "playBtn is present in tree");
    assert.ok(quitBtn, "quitBtn is present in tree");
    // Each instance has its own children (stubs from prefab body).
    assert.equal(playBtn.children.length, 2, "playBtn has bg + caption");
    assert.equal(quitBtn.children.length, 2, "quitBtn has bg + caption");
});

test("library-nested: transitive prefab composition resolves", () => {
    const doc = loadFixture("valid/library-nested.json");
    const root = readLibraryDocument(doc, baseOptions);

    const btn = findByLabel(root, "settingsBtn");
    assert.ok(btn, "IconButton instance present");
    const glyph = findByLabel(btn, "glyph");
    assert.ok(glyph, "nested Icon prefab instance present under IconButton");
});

test("core-shape document: Library reader accepts (Library ⊇ Core)", () => {
    const doc = loadFixture("valid/core-minimal.json");
    const root = readLibraryDocument(doc, baseOptions);
    assert.equal(root.label, "root");
    assert.equal(root.children.length, 1);
});

test("scene-shape document: Library reader rejects with clear error", () => {
    const doc = loadFixture("valid/scene-modes.json");
    assert.throws(
        () => readLibraryDocument(doc, baseOptions),
        /scene-shape/,
        "error message mentions scene-shape",
    );
});

test("scope isolation: mask inside prefab resolves per instance, not cross-instance", () => {
    // Each instance of `Masked` has a mask pointing to its own local `m`.
    // If scope leaked (shared idMap across instances), both masks would
    // resolve to the last-registered `m` — the second instance's mask source.
    const doc = {
        format: "pixi-layout" as const,
        version: 1 as const,
        prefabs: {
            Masked: {
                id: "root",
                type: "container",
                mask: "m",
                children: [
                    {
                        id: "m",
                        type: "graphics",
                        shape: "rect",
                        width: 10,
                        height: 10,
                        fill: "#ffffff",
                    },
                    {
                        id: "body",
                        type: "graphics",
                        shape: "rect",
                        width: 20,
                        height: 20,
                        fill: "#ff0000",
                    },
                ],
            },
        },
        root: {
            id: "root",
            type: "container",
            children: [
                { id: "a", type: "Masked" },
                { id: "b", type: "Masked" },
            ],
        },
    };

    const root = readLibraryDocument(doc, baseOptions);
    const a = findByLabel(root, "a");
    const b = findByLabel(root, "b");
    assert.ok(a && b, "both instances present");
    // Each instance's `.mask` is set by the dispatcher after its scope's
    // mask resolution. Correct behavior: a.mask === a.children[0] (its own m).
    assert.strictEqual(a.mask, a.children[0], "instance A mask points to A's own source");
    assert.strictEqual(b.mask, b.children[0], "instance B mask points to B's own source");
    assert.notStrictEqual(a.mask, b.mask, "mask sources are distinct per instance");
});

test("prefab name collides with intrinsic type: Library reader rejects (§12.1 guard)", () => {
    const doc = {
        format: "pixi-layout" as const,
        version: 1 as const,
        prefabs: {
            sprite: { id: "root", type: "container" },
        },
        root: {
            id: "root",
            type: "container",
        },
    };
    assert.throws(
        () => readLibraryDocument(doc, baseOptions),
        /collides with registered type/,
        "error message mentions collision",
    );
});
