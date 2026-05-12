/**
 * Runtime smoke tests for the Core reader's registry and extension-handler
 * APIs. Complements `run-fixtures.ts` which only exercises validation.
 *
 * Uses `node:test` and `node:assert/strict`. Documents are inline — no
 * dependency on `docs/fixtures/`.
 *
 * Every test avoids Sprite and Text, which require a browser-like environment
 * for texture loading and canvas measurement. Container and Graphics are
 * instantiable in Node without a renderer.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { Container } from "pixi.js";

import {
    readCoreDocument,
    resolveBindings,
    resolveDecisionValue,
    type ExtensionHandler,
    type NodeBuilder,
} from "../src/core-reader.js";

const resolveStub = { texture: () => ({}) as never };

test("custom builder registered via options.builders is invoked", () => {
    const doc = {
        format: "pxd" as const,
        version: 1 as const,
        root: {
            id: "root",
            type: "container",
            children: [{ id: "btn", type: "Button" }],
        },
    };

    let buttonCalled = 0;
    const buildButton: NodeBuilder = () => {
        buttonCalled++;
        return new Container();
    };

    const root = readCoreDocument(doc, {
        resolve: resolveStub,
        builders: new Map([["Button", buildButton]]),
    });

    assert.equal(buttonCalled, 1, "builder should be called once");
    assert.equal(root.children.length, 1);
    assert.equal(root.children[0].label, "btn", "dispatcher applies label from ref node");
});

test("extension handler registered via options.extensions is invoked with correct args", () => {
    const doc = {
        format: "pxd" as const,
        version: 1 as const,
        root: {
            id: "root",
            type: "container",
            extensions: { VENDOR_mark: { tag: "test" } },
        },
    };

    let capturedPayload: unknown = null;
    let capturedTargetLabel: string | undefined;
    let capturedNodeId: string | undefined;
    const handler: ExtensionHandler = (payload, target, node, _ctx) => {
        capturedPayload = payload;
        capturedTargetLabel = target.label as string;
        capturedNodeId = node.id;
    };

    const root = readCoreDocument(doc, {
        resolve: resolveStub,
        extensions: new Map([["VENDOR_mark", handler]]),
    });

    assert.deepEqual(capturedPayload, { tag: "test" }, "payload passed verbatim");
    assert.equal(capturedTargetLabel, "root", "target label == node id");
    assert.equal(capturedNodeId, "root");
    assert.equal(root.label, "root");
});

test("dispatch order: handler runs AFTER applyBaseFields (can override)", () => {
    const doc = {
        format: "pxd" as const,
        version: 1 as const,
        root: {
            id: "root",
            type: "container",
            x: 100,
            extensions: { VENDOR_move: {} },
        },
    };

    const handler: ExtensionHandler = (_payload, target) => {
        target.x = 999;
    };

    const root = readCoreDocument(doc, {
        resolve: resolveStub,
        extensions: new Map([["VENDOR_move", handler]]),
    });

    assert.equal(
        root.x,
        999,
        "handler override wins — proves handler runs AFTER applyBaseFields",
    );
});

test("rotation field is interpreted as degrees and converted to radians (§6)", () => {
    const doc = {
        format: "pxd" as const,
        version: 1 as const,
        root: {
            id: "root",
            type: "container",
            rotation: 90,
        },
    };
    const root = readCoreDocument(doc, { resolve: resolveStub });
    assert.ok(Math.abs(root.rotation - Math.PI / 2) < 1e-9, `90deg → π/2, got ${root.rotation}`);
});

test("§7.2 string bindings: resolver expands {path} in any string field", () => {
    const doc = {
        format: "pxd" as const,
        version: 1 as const,
        root: {
            id: "root",
            type: "container",
            extensions: { VENDOR_capture: { tag: "see-handler" } },
        },
    };

    const calls: string[] = [];
    const handler: ExtensionHandler = (_p, _t, _n, ctx) => {
        calls.push(ctx.readString("Bet: {settings.bet} {locale.coins}"));
        calls.push(ctx.readString("flag_\\{en}_v2"));
    };

    const lookups: Record<string, string> = {
        "settings.bet": "10",
        "locale.coins": "monedas",
    };
    readCoreDocument(doc, {
        resolve: { texture: () => ({}) as never, binding: (p) => lookups[p] ?? `[${p}]` },
        extensions: new Map([["VENDOR_capture", handler]]),
    });

    assert.equal(calls[0], "Bet: 10 monedas", "multi-binding substitution + literal segments");
    assert.equal(calls[1], "flag_{en}_v2", "escaped braces yield literals, no resolution");
});

test("resolveBindings: unterminated binding throws", () => {
    assert.throws(
        () => resolveBindings("hello {oops", () => ""),
        /unterminated binding/,
    );
});

test("resolveBindings: substituted values are NOT re-scanned", () => {
    const out = resolveBindings("{a}", (p) => (p === "a" ? "{b}" : "RECURSED"));
    assert.equal(out, "{b}", "second pass MUST NOT occur");
});

test("§3.6 decision values: most-specific selector wins", () => {
    assert.equal(resolveDecisionValue({ _: 100, mobile: 50 }, new Set(["mobile"])), 50);
    assert.equal(resolveDecisionValue({ _: 100, mobile: 50 }, new Set(["desktop"])), 100);
    assert.equal(
        resolveDecisionValue({ _: 320, de: 400, "de+mobile": 360 }, new Set(["de", "mobile"])),
        360,
        "two-tag selector beats single-tag at equal coverage",
    );
    assert.equal(
        resolveDecisionValue({ _: 320, de: 400, "de+mobile": 360 }, new Set(["de"])),
        400,
    );
});

test("§3.6 decision values: tie-break is declaration order", () => {
    const map = { _: 100, de: 50, mobile: 60 } as Record<string, number>;
    // Active = { de, mobile }: both single-tag selectors match with spec 1.
    // First declared (`de`) wins.
    assert.equal(resolveDecisionValue(map, new Set(["de", "mobile"])), 50);
});

test("§3.6 decision values: plain object without _ passes through unchanged", () => {
    const inline = { fontSize: 16, fill: "red" };
    assert.equal(resolveDecisionValue(inline, new Set(["mobile"])), inline);
});

test("§3.6 decision values: empty activeTags picks default", () => {
    assert.equal(resolveDecisionValue({ _: 100, mobile: 50 }, new Set()), 100);
});

test("§3.6 decision values: unsorted selector throws at resolve time", () => {
    assert.throws(
        () => resolveDecisionValue({ _: 1, "mobile+de": 2 }, new Set(["de", "mobile"])),
        /not lexicographically sorted/,
    );
});

test("§3.6 integrates with full reader: container x picks from activeTags", () => {
    const doc = {
        format: "pxd" as const,
        version: 1 as const,
        root: {
            id: "root",
            type: "container",
            x: { _: 100, mobile: 50 },
        },
    };
    const root = readCoreDocument(doc, {
        resolve: resolveStub,
        activeTags: ["mobile"],
    });
    assert.equal(root.x, 50, "mobile branch picked");
});

test("unregistered extension in node.extensions is silently ignored", () => {
    const doc = {
        format: "pxd" as const,
        version: 1 as const,
        extensionsUsed: ["VENDOR_unknown"],
        root: {
            id: "root",
            type: "container",
            extensions: { VENDOR_unknown: { data: 1 } },
        },
    };

    // No handlers registered. Per spec §9.3 the reader MUST still load.
    const root = readCoreDocument(doc, { resolve: resolveStub });
    assert.equal(root.label, "root", "document loaded without error");
});
