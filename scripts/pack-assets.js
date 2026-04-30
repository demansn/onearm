import path from "path";
import fs from "fs";
import { AssetPack } from "@assetpack/core";
import { pixiPipes } from "@assetpack/core/pixi";
import { findGameRoot } from "./utils/find-game-root.js";

/**
 * Pack image assets using AssetPack.
 *
 * @param {string | { sources: string[], outputDir: string, cacheDir?: string, cacheBust?: boolean }} arg
 *   String (legacy): gameRoot path — sources=[gameRoot/assets], outputDir=gameRoot/dist/assets/img
 *   Object: { sources, outputDir, cacheDir, cacheBust }
 *     sources   - array of asset dirs (merged in order, last wins)
 *     outputDir - destination for spritesheets
 *     cacheDir  - path for AssetPack cache (enables caching when set)
 *     cacheBust - if true, embed hash in output filenames (default false)
 */
export async function packAssets(arg) {
    // Backwards-compat: packAssets(gameRoot) → new form
    let sources, outputDir, cacheDir, cacheBust;
    if (typeof arg === "string" || arg == null) {
        const gameRoot = arg ?? findGameRoot();
        sources = [path.join(gameRoot, "assets")];
        outputDir = path.join(gameRoot, "dist", "assets", "img");
        cacheDir = null;
        cacheBust = false;
    } else {
        ({ sources, outputDir, cacheDir, cacheBust = false } = arg);
    }

    // Collect img dirs from all sources (last wins per file)
    const imgDirs = sources
        .map((s) => path.join(s, "img"))
        .filter((d) => fs.existsSync(d));

    if (imgDirs.length === 0) {
        console.log("No assets/img/ directory found, skipping asset packing");
        return;
    }

    // For multi-source: merge into a temp dir so AssetPack sees one root
    let entryDir;
    let tempDir = null;
    if (imgDirs.length === 1) {
        entryDir = imgDirs[0];
    } else {
        // Merge sources into a temp directory (last source wins)
        const os = await import("os");
        tempDir = fs.mkdtempSync(path.join(os.default.tmpdir(), "skin-pack-"));
        for (const imgDir of imgDirs) {
            fs.cpSync(imgDir, tempDir, { recursive: true });
        }
        entryDir = tempDir;
    }

    try {
        const assetpack = new AssetPack({
            entry: entryDir,
            output: outputDir,
            cache: !!cacheDir,
            ...(cacheDir ? { cacheLocation: cacheDir } : {}),
            logLevel: "warn",
            ignore: ["**/meta.json", "**/loose.json"],
            pipes: [
                ...pixiPipes({
                    cacheBust,
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
    } finally {
        if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
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
