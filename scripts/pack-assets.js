import path from "path";
import fs from "fs";
import { AssetPack } from "@assetpack/core";
import { pixiPipes } from "@assetpack/core/pixi";
import { findGameRoot } from "./utils/find-game-root.js";

export async function packAssets(gameRoot) {
    if (!gameRoot) gameRoot = findGameRoot();

    const imgDir = path.join(gameRoot, "assets", "img");
    const outputDir = path.join(gameRoot, "dist", "assets", "img");

    if (!fs.existsSync(imgDir)) {
        console.log("No assets/img/ directory found, skipping asset packing");
        return;
    }

    const assetpack = new AssetPack({
        entry: imgDir,
        output: outputDir,
        cache: false,
        logLevel: "warn",
        ignore: ["**/meta.json", "**/loose.json"],
        pipes: [
            ...pixiPipes({
                cacheBust: false,
                texturePacker: {
                    texturePacker: {
                        nameStyle: "relative",
                    },
                    removeFileExtension: true,
                    padding: 2,
                    allowRotation: false,
                },
                resolutions: { default: 1 },
                compression: {
                    webp: { quality: 80 },
                    avif: false,
                },
                manifest: {
                    output: "manifest.json",
                    trimExtensions: true,
                    createShortcuts: true,
                    nameStyle: "relative",
                },
            }),
        ],
    });

    await assetpack.run();

    // AssetPack's removeFileExtension doesn't strip extensions from frame names.
    // Post-process spritesheet JSONs to remove .png/.jpg/.webp from frame keys.
    const jsonFiles = fs
        .readdirSync(outputDir)
        .filter((f) => f.endsWith(".json") && f !== "manifest.json");

    for (const file of jsonFiles) {
        const filePath = path.join(outputDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

        if (!data.frames) continue;

        const cleaned = {};
        for (const [key, value] of Object.entries(data.frames)) {
            cleaned[key.replace(/\.(png|jpg|jpeg|webp)$/i, "")] = value;
        }
        data.frames = cleaned;
        fs.writeFileSync(filePath, JSON.stringify(data));
    }
}

// CLI mode
const isMainModule =
    process.argv[1] &&
    path.resolve(process.argv[1]) ===
        path.resolve(new URL(import.meta.url).pathname);

if (isMainModule) {
    console.log("Packing assets...");
    packAssets()
        .then(() => console.log("Done!"))
        .catch((err) => {
            console.error("Asset packing failed:", err);
            process.exit(1);
        });
}
