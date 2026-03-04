import fs from "fs";
import path from "path";
import { gzipSync } from "zlib";
import { findGameRoot } from "./utils/find-game-root.js";

const gameRoot = findGameRoot();
const distDir = path.join(gameRoot, "dist");
const historyFile = path.join(gameRoot, ".bundle-sizes.json");
const shouldSave = process.argv.includes("--save");

function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(2)} MB`;
}

function getFiles(dir, extensions) {
    const results = [];
    if (!fs.existsSync(dir)) return results;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...getFiles(fullPath, extensions));
        } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
            results.push(fullPath);
        }
    }
    return results;
}

function measure(filePath) {
    const content = fs.readFileSync(filePath);
    const gzipped = gzipSync(content);
    return { raw: content.length, gzip: gzipped.length };
}

// Collect sizes
const files = getFiles(distDir, [".js", ".css"]);

if (files.length === 0) {
    console.log("No .js/.css files found in dist/. Run a build first.");
    process.exit(0);
}

// Load previous sizes
let previous = {};
if (fs.existsSync(historyFile)) {
    try {
        previous = JSON.parse(fs.readFileSync(historyFile, "utf8"));
    } catch (_e) {
        /* ignore */
    }
}

const current = {};
const rows = [];

for (const file of files.sort()) {
    const rel = path.relative(distDir, file);
    const sizes = measure(file);
    current[rel] = sizes;

    const prev = previous[rel];
    let diff = "";
    if (prev) {
        const delta = sizes.gzip - prev.gzip;
        if (delta !== 0) {
            const sign = delta > 0 ? "+" : "";
            diff = ` (${sign}${formatSize(delta)})`;
        }
    }

    rows.push([rel, formatSize(sizes.raw), formatSize(sizes.gzip) + diff]);
}

// Print table
const colWidths = [
    Math.max(4, ...rows.map((r) => r[0].length)),
    Math.max(3, ...rows.map((r) => r[1].length)),
    Math.max(4, ...rows.map((r) => r[2].length)),
];

console.log("");
console.log(
    "File".padEnd(colWidths[0]) + "  " + "Raw".padStart(colWidths[1]) + "  " + "Gzip".padStart(colWidths[2]),
);
console.log("-".repeat(colWidths[0]) + "  " + "-".repeat(colWidths[1]) + "  " + "-".repeat(colWidths[2]));

for (const [name, raw, gzip] of rows) {
    console.log(name.padEnd(colWidths[0]) + "  " + raw.padStart(colWidths[1]) + "  " + gzip.padStart(colWidths[2]));
}

// Totals
const totalRaw = Object.values(current).reduce((s, v) => s + v.raw, 0);
const totalGzip = Object.values(current).reduce((s, v) => s + v.gzip, 0);
console.log("-".repeat(colWidths[0]) + "  " + "-".repeat(colWidths[1]) + "  " + "-".repeat(colWidths[2]));
console.log(
    "Total".padEnd(colWidths[0]) +
        "  " +
        formatSize(totalRaw).padStart(colWidths[1]) +
        "  " +
        formatSize(totalGzip).padStart(colWidths[2]),
);
console.log("");

// Save
if (shouldSave) {
    fs.writeFileSync(historyFile, JSON.stringify(current, null, 2));
    console.log(`Sizes saved to ${path.relative(gameRoot, historyFile)}`);
}
