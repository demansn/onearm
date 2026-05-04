const DEFAULT_SKIN = "default";

/**
 * Resolve and fetch the active skin manifest.
 *
 * @param {string[]} skinList — list of available skins from window.__SKINS__
 * @returns {{ name: string, manifest: object }}
 */
export async function loadSkin(skinList) {
    const requested = readRequestedSkin();
    const resolved = skinList.includes(requested) ? requested : DEFAULT_SKIN;

    if (requested !== DEFAULT_SKIN && !skinList.includes(requested)) {
        console.warn(`[skin] "${requested}" not in available skins, falling back to default`);
    }

    let manifest = await tryFetchManifest(resolved);

    if (!manifest && resolved !== DEFAULT_SKIN) {
        console.warn(`[skin] manifest.json not found for "${resolved}", falling back to default`);
        manifest = await tryFetchManifest(DEFAULT_SKIN);
    }

    if (!manifest) {
        throw new Error("Cannot load skin manifest (default missing).");
    }

    if (!Array.isArray(manifest.bundles)) {
        throw new Error(`Skin "${resolved}" manifest is malformed: bundles is not an array.`);
    }

    return { name: resolved, manifest: normalizeManifest(manifest, resolved) };
}

function readRequestedSkin() {
    try {
        const params = new URLSearchParams(location.search);
        const param = params.get("s") ?? params.get("skin");
        return param && param.trim() !== "" ? param.trim() : DEFAULT_SKIN;
    } catch {
        return DEFAULT_SKIN;
    }
}

async function tryFetchManifest(skin) {
    try {
        const res = await fetch(`/skins/${skin}/manifest.json`);
        if (!res.ok) return null;
        return await res.json();
    } catch (err) {
        console.error(`[skin] manifest.json error for "${skin}":`, err);
        return null;
    }
}

function normalizeManifest(manifest, skin) {
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
