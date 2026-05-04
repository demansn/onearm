/**
 * Normalize a manifest object for skin mode: rewrite relative `src` paths
 * so they point to /skins/<skin>/... at runtime.
 *
 * The manifest bundles reference `./assets/...` paths which are valid relative
 * to the skin output dir. loadSkin.js also rewrites them, but normalizeManifest
 * here is used to produce the on-disk manifest.json with absolute-ish paths so
 * the file can be inspected without runtime ambiguity.
 */
export function normalizeManifest(manifest, skin) {
    return {
        ...manifest,
        bundles: manifest.bundles.map((bundle) => ({
            ...bundle,
            assets: bundle.assets.map((asset) => ({
                ...asset,
                src: rewriteSrc(asset.src, skin),
            })),
        })),
    };
}

function rewriteSrc(src, skin) {
    if (Array.isArray(src)) return src.map((s) => rewriteSrc(s, skin));
    if (/^(?:https?:)?\/\//.test(src) || src.startsWith("data:") || src.startsWith("blob:")) {
        return src;
    }
    if (src.startsWith("/")) return src;
    const trimmed = src.replace(/^\.\//, "");
    return `/skins/${skin}/${trimmed}`;
}
