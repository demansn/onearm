/**
 * Runs the reference validator against the conformance fixtures at
 * `docs/fixtures/pixi-layout-v1/`.
 *
 * Contract:
 *   - Every file under `valid/` MUST validate without error.
 *   - Every file under `invalid/` MUST throw a `ValidationError`.
 *
 * Exits with code 1 on any failure.
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { readCoreDocument } from "../src/core-reader.js";
import { ValidationError, validate } from "../src/validate.js";

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURES_ROOT = resolve(here, "../../../../docs/fixtures/pixi-layout-v1");

interface Failure {
    file: string;
    expected: "valid" | "invalid";
    message: string;
}

function listJson(dir: string): string[] {
    return readdirSync(dir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => join(dir, f))
        .sort();
}

function loadJson(path: string): unknown {
    return JSON.parse(readFileSync(path, "utf8"));
}

function rel(path: string): string {
    return path.slice(FIXTURES_ROOT.length + 1);
}

const failures: Failure[] = [];
let passed = 0;

// Valid fixtures: MUST validate.
for (const file of listJson(join(FIXTURES_ROOT, "valid"))) {
    try {
        validate(loadJson(file));
        passed++;
        console.log(`  ok  valid/${rel(file).replace(/^valid\//, "")}`);
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        failures.push({ file: rel(file), expected: "valid", message });
        console.log(`  FAIL valid/${rel(file).replace(/^valid\//, "")} — ${message}`);
    }
}

// Invalid fixtures: MUST throw ValidationError.
for (const file of listJson(join(FIXTURES_ROOT, "invalid"))) {
    try {
        validate(loadJson(file));
        failures.push({
            file: rel(file),
            expected: "invalid",
            message: "expected validation failure but document validated successfully",
        });
        console.log(`  FAIL ${rel(file)} — accepted but should have been rejected`);
    } catch (e) {
        if (e instanceof ValidationError) {
            passed++;
            console.log(`  ok  ${rel(file)} — rejected with ${e.message}`);
        } else {
            const message = e instanceof Error ? e.message : String(e);
            failures.push({
                file: rel(file),
                expected: "invalid",
                message: `expected ValidationError, got ${message}`,
            });
            console.log(`  FAIL ${rel(file)} — ${message}`);
        }
    }
}

// Reader contract: readCoreDocument MUST reject library-shape and scene-shape
// documents even when they are themselves valid, because the reader only
// supports Core. We don't touch Pixi — the rejection happens before any
// instantiation, so no renderer is needed in Node.
for (const shapeName of ["library-simple", "scene-modes"]) {
    const file = `valid/${shapeName}.json`;
    try {
        const doc = loadJson(join(FIXTURES_ROOT, file));
        readCoreDocument(doc, { resolve: { texture: () => ({}) as never } });
        failures.push({
            file: `reader/${shapeName}`,
            expected: "invalid",
            message: "core reader accepted a non-core-shape document",
        });
        console.log(`  FAIL reader rejects ${shapeName}-shape — accepted`);
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (message.includes("core-shape")) {
            passed++;
            console.log(`  ok  reader rejects ${shapeName}-shape`);
        } else {
            failures.push({
                file: `reader/${shapeName}`,
                expected: "invalid",
                message: `expected shape rejection, got ${message}`,
            });
            console.log(`  FAIL reader rejects ${shapeName}-shape — ${message}`);
        }
    }
}

console.log("");
console.log(`${passed} passed, ${failures.length} failed`);

if (failures.length > 0) {
    console.log("");
    console.log("Failures:");
    for (const f of failures) {
        console.log(`  ${f.file} (expected ${f.expected}): ${f.message}`);
    }
    process.exit(1);
}
