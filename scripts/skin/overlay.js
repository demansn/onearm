import fs from "fs";
import path from "path";

const SKIN_NAME_REGEX = /^[a-z0-9_-]+$/i;

export function validateSkinName(name) {
    if (!name || !SKIN_NAME_REGEX.test(name)) {
        throw new Error(`Invalid skin name: "${name}". Allowed chars: a-z, 0-9, _, -`);
    }
}

/**
 * Validate that every file in <gameRoot>/skins/<skin>/ has a matching file in
 * <gameRoot>/assets/. Files in the overlay without a base counterpart are errors
 * (likely a typo in the path).
 */
export function validateOverlay(gameRoot, skin) {
    const overlayRoot = path.join(gameRoot, "skins", skin);
    const baseRoot = path.join(gameRoot, "assets");

    if (!fs.existsSync(overlayRoot)) {
        throw new Error(`Skin overlay not found: skins/${skin}/`);
    }

    const orphans = [];
    walk(overlayRoot, "", (relPath) => {
        if (!fs.existsSync(path.join(baseRoot, relPath))) {
            orphans.push(relPath);
        }
    });

    if (orphans.length > 0) {
        const list = orphans.map((p) => `  - ${p}`).join("\n");
        throw new Error(
            `Skin "${skin}" has files with no matching base in assets/:\n${list}\n` +
            `Either remove them from skins/${skin}/ or add a base file in assets/.`,
        );
    }
}

function walk(root, rel, onFile) {
    const dir = path.join(root, rel);
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const childRel = rel ? path.join(rel, entry.name) : entry.name;
        if (entry.isDirectory()) {
            walk(root, childRel, onFile);
        } else {
            onFile(childRel);
        }
    }
}

/**
 * Discover skin overlay directories under <gameRoot>/skins/.
 * Returns array of skin names (e.g. ["halloween", "neon"]).
 */
export function discoverExtraSkins(gameRoot) {
    const skinsDir = path.join(gameRoot, "skins");
    if (!fs.existsSync(skinsDir)) return [];
    return fs
        .readdirSync(skinsDir, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort();
}
