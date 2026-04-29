import fs from "fs";
import path from "path";
import { packAssets } from "../pack-assets.js";
import { generateManifest } from "../generate-manifest.js";
import { validateOverlay } from "./overlay.js";
import { normalizeManifest } from "./manifest.js";

/**
 * Pack a single skin into dist/skins/<skin>/.
 *
 * For "default": packs assets/ only.
 * For extra skins: merges assets/ + skins/<skin>/ (overlay wins per file).
 *
 * Output:
 *   dist/skins/<skin>/
 *     assets/     ← spritesheets, sounds, spine, fonts…
 *     manifest.json ← { bundles: [...] } with /skins/<skin>/... paths
 */
export async function packSkin(gameRoot, skin) {
    if (skin === "default" && fs.existsSync(path.join(gameRoot, "skins", "default"))) {
        throw new Error("skins/default/ is reserved — assets/ IS the default skin");
    }

    if (skin !== "default") {
        validateOverlay(gameRoot, skin);
    }

    const sources = skin === "default"
        ? [path.join(gameRoot, "assets")]
        : [path.join(gameRoot, "assets"), path.join(gameRoot, "skins", skin)];

    const outputDir = path.join(gameRoot, "dist", "skins", skin);
    const outputImgDir = path.join(outputDir, "assets", "img");

    console.log(`[skin] Packing "${skin}"...`);

    // Pack image spritesheets
    await packAssets({
        sources,
        outputDir: outputImgDir,
        cacheDir: path.join(gameRoot, ".cache", skin),
        cacheBust: true,
    });

    // Generate manifest (scans base source + uses distImgDir for spritesheet refs)
    const manifest = generateManifest({
        sources,
        distImgDir: outputImgDir,
    });

    // Copy non-image assets (sound, spine, fonts, etc.) from all sources to output
    copyOverlayedAssets(sources, path.join(outputDir, "assets"));

    // Write skin manifest with rewritten /skins/<skin>/... paths
    const skinManifest = normalizeManifest(manifest, skin);
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(
        path.join(outputDir, "manifest.json"),
        JSON.stringify(skinManifest, null, 2) + "\n",
    );

    console.log(`[skin] Done: dist/skins/${skin}/`);
}

/**
 * Copy non-image assets from sources into destAssetsDir.
 * Later sources (overlay) overwrite earlier ones.
 * Skips the img/ directory (handled by packAssets).
 */
function copyOverlayedAssets(sources, destAssetsDir) {
    const SKIP = new Set(["img"]);
    for (const src of sources) {
        if (!fs.existsSync(src)) continue;
        fs.cpSync(src, destAssetsDir, {
            recursive: true,
            filter: (srcPath) => {
                const rel = path.relative(src, srcPath);
                if (!rel) return true;
                const top = rel.split(path.sep)[0];
                return !SKIP.has(top);
            },
        });
    }
}
