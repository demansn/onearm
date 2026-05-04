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
    type ExtensionHandler,
    type NodeBuilder,
} from "../src/core-reader.js";

const resolveStub = { texture: () => ({}) as never };

test("custom builder registered via options.builders is invoked", () => {
    const doc = {
        format: "pixi-layout" as const,
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
        format: "pixi-layout" as const,
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
        format: "pixi-layout" as const,
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

test("unregistered extension in node.extensions is silently ignored", () => {
    const doc = {
        format: "pixi-layout" as const,
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
