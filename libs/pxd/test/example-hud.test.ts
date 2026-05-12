/**
 * Smoke test for the example HUD doc — ensures examples/hud-doc.json
 * validates and builds with custom NodeTypes registered for SpinButton/IconButton.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Container } from "pixi.js";

import { build } from "../src/build.js";
import { validate } from "../src/validate.js";
import type { NodeType, Resolvers } from "../src/context.js";

const here = dirname(fileURLToPath(import.meta.url));
const docPath = resolve(here, "../../examples/hud-doc.json");
const doc = JSON.parse(readFileSync(docPath, "utf8"));

const resolveStub: Resolvers = {
    texture: () => ({}) as never,
    style: () => undefined,
    binding: (p) => `[${p}]`,
};

const stubLeaf: NodeType = { create: () => new Container() };

test("example: hud-doc.json validates", () => {
    assert.doesNotThrow(() => validate(doc));
});

test("example: hud-doc.json builds (mobile + ru + dark)", () => {
    const root = build(doc, {
        resolve: resolveStub,
        activeTags: ["mobile", "ru", "dark"],
        nodeTypes: new Map([
            ["SpinButton", stubLeaf],
            ["IconButton", stubLeaf],
        ]),
    });
    assert.equal(root.label, "hud");
    assert.equal(root.scale.x, 0.75);
});

test("example: hud-doc.json builds (desktop + en)", () => {
    const root = build(doc, {
        resolve: resolveStub,
        activeTags: ["desktop", "en"],
        nodeTypes: new Map([
            ["SpinButton", stubLeaf],
            ["IconButton", stubLeaf],
        ]),
    });
    assert.equal(root.scale.x, 1);
});
