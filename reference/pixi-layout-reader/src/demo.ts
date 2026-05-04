/**
 * Browser demo for the Pixi Layout v1 Core reader.
 *
 * Loads an inline core-shape document, instantiates it into a Pixi display
 * tree using the reference reader, and adds it to a Pixi Application stage.
 *
 * Textures are stubbed to `Texture.WHITE`; a real app substitutes its own
 * asset resolver. This demo intentionally avoids a bundler or asset pipeline.
 */

import { Application, Texture } from "pixi.js";
import { readCoreDocument } from "./core-reader.js";
import type { CoreDocument } from "./types.js";

const demoDoc: CoreDocument = {
    format: "pixi-layout",
    version: 1,
    profile: "core",
    root: {
        id: "root",
        type: "container",
        children: [
            {
                id: "bg",
                type: "graphics",
                shape: "rect",
                width: 800,
                height: 600,
                fill: "#1f2937",
            },
            {
                id: "card",
                type: "graphics",
                shape: "roundRect",
                x: 80,
                y: 120,
                width: 640,
                height: 360,
                fill: "#374151",
                radius: 24,
            },
            {
                id: "logoDot",
                type: "graphics",
                shape: "circle",
                x: 400,
                y: 220,
                radius: 48,
                fill: "#fbbf24",
            },
            {
                id: "title",
                type: "text",
                text: "Pixi Layout v1",
                style: "h1",
                x: 400,
                y: 310,
                anchorX: 0.5,
            },
            {
                id: "subtitle",
                type: "text",
                text: "Core profile reference reader",
                style: "body",
                x: 400,
                y: 360,
                anchorX: 0.5,
            },
            {
                id: "logoSprite",
                type: "sprite",
                texture: "pixel",
                x: 380,
                y: 420,
                width: 40,
                height: 40,
                tint: 0xfbbf24,
            },
        ],
    },
};

async function run(): Promise<void> {
    const app = new Application();
    await app.init({ width: 800, height: 600, background: "#111827", antialias: true });
    document.getElementById("canvas-host")!.appendChild(app.canvas);

    const root = readCoreDocument(demoDoc, {
        resolve: {
            texture: () => Texture.WHITE,
            style: (id) => {
                if (id === "h1") return { fill: "#ffffff", fontSize: 36, fontWeight: "700" };
                if (id === "body") return { fill: "#9ca3af", fontSize: 18 };
                return {};
            },
        },
    });
    app.stage.addChild(root);
}

run().catch((err) => {
    console.error(err);
    const host = document.getElementById("canvas-host");
    if (host) host.textContent = `Error: ${err instanceof Error ? err.message : String(err)}`;
});
