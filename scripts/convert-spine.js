#!/usr/bin/env node

import { execSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, renameSync, unlinkSync, readdirSync, statSync, rmSync } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ONEARM_ROOT = resolve(__dirname, "..");
const GAME_ROOT = resolve(ONEARM_ROOT, "..");
const SPINE_DIR = join(GAME_ROOT, "assets", "spine");
const CACHE_DIR = join(ONEARM_ROOT, ".cache", "spine-converter");
const CONVERTER_BIN = join(CACHE_DIR, "SpineSkeletonDataConverter");
const CONVERTER_REPO = "https://github.com/wang606/SpineSkeletonDataConverter.git";

// Parse CLI args
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const noBackup = args.includes("--no-backup");
const targetArg = args.find((a) => a.startsWith("--target="));
const targetVersion = targetArg ? targetArg.split("=")[1] : "4.2.0";

// ─── Ensure converter binary ───

function ensureConverter() {
    if (existsSync(CONVERTER_BIN)) {
        console.log("✓ Converter binary found at", CONVERTER_BIN);
        return;
    }

    console.log("Building SpineSkeletonDataConverter from source...");

    // Check cmake
    const cmakeCheck = spawnSync("cmake", ["--version"], { stdio: "pipe" });
    if (cmakeCheck.status !== 0) {
        console.error("ERROR: cmake not found. Install it with: brew install cmake");
        process.exit(1);
    }

    const tmpDir = join(ONEARM_ROOT, ".cache", "spine-converter-build");
    try {
        // Clean previous failed build if exists
        if (existsSync(tmpDir)) {
            rmSync(tmpDir, { recursive: true, force: true });
        }
        mkdirSync(tmpDir, { recursive: true });
        mkdirSync(CACHE_DIR, { recursive: true });

        console.log("  Cloning repository...");
        execSync(`git clone --depth 1 ${CONVERTER_REPO} ${tmpDir}/repo`, { stdio: "inherit" });

        // Patch missing #include <sstream> in SkeletonData.h (macOS Clang requires it)
        const skeletonDataH = join(tmpDir, "repo", "include", "SkeletonData.h");
        if (existsSync(skeletonDataH)) {
            let content = readFileSync(skeletonDataH, "utf8");
            if (!content.includes("<sstream>")) {
                content = content.replace("#include <string>", "#include <string>\n#include <sstream>");
                writeFileSync(skeletonDataH, content);
                console.log("  Patched SkeletonData.h (added #include <sstream>)");
            }
        }

        console.log("  Building...");
        execSync("cmake -B build -DCMAKE_BUILD_TYPE=Release", { cwd: join(tmpDir, "repo"), stdio: "inherit" });
        execSync("cmake --build build", { cwd: join(tmpDir, "repo"), stdio: "inherit" });

        // Find the built binary
        const buildDir = join(tmpDir, "repo", "build");
        const binPath = findBinary(buildDir, "SpineSkeletonDataConverter");
        if (!binPath) {
            console.error("ERROR: Could not find built binary in", buildDir);
            process.exit(1);
        }

        copyFileSync(binPath, CONVERTER_BIN);
        execSync(`chmod +x "${CONVERTER_BIN}"`);
        console.log("✓ Converter built and cached at", CONVERTER_BIN);
    } finally {
        if (existsSync(tmpDir)) {
            rmSync(tmpDir, { recursive: true, force: true });
        }
    }
}

function findBinary(dir, name) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            const found = findBinary(fullPath, name);
            if (found) return found;
        } else if (entry.name === name) {
            return fullPath;
        }
    }
    return null;
}

// ─── Scan spine files ───

function scanSpineFiles() {
    const files = [];
    if (!existsSync(SPINE_DIR)) {
        console.error("ERROR: Spine directory not found:", SPINE_DIR);
        process.exit(1);
    }
    walk(SPINE_DIR, files);
    return files;
}

function walk(dir, results) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name.startsWith(".backup")) continue;
            walk(fullPath, results);
        } else if (entry.name.endsWith(".json")) {
            const info = classifySpineFile(fullPath);
            if (info) results.push(info);
        }
    }
}

function classifySpineFile(filePath) {
    try {
        const buf = readFileSync(filePath, { encoding: "utf8", length: 1000 });
        // Quick check: does it look like a spine skeleton file?
        const skeletonMatch = buf.match(/"skeleton"\s*:\s*\{[^}]*"spine"\s*:\s*"([^"]+)"/);
        if (!skeletonMatch) return null;

        const version = skeletonMatch[1];
        const majorMinor = version.split(".").slice(0, 2).join(".");
        const major = parseInt(version.split(".")[0], 10);

        let category;
        if (major < 4) {
            category = "convert";
        } else {
            category = "skip";
        }

        return {
            path: filePath,
            relativePath: relative(GAME_ROOT, filePath),
            version,
            category,
        };
    } catch {
        return null;
    }
}

// ─── Backup ───

function createBackups(files) {
    const backupDir = join(SPINE_DIR, ".backup-3.7");
    for (const file of files) {
        const relToSpine = relative(SPINE_DIR, file.path);
        const backupPath = join(backupDir, relToSpine);
        mkdirSync(dirname(backupPath), { recursive: true });
        copyFileSync(file.path, backupPath);
    }
    console.log(`✓ Backups created in assets/spine/.backup-3.7/ (${files.length} files)`);
}

// ─── Convert ───

function convertFile(file) {
    const tmpOutput = file.path + ".tmp.json";
    const result = spawnSync(
        CONVERTER_BIN,
        [file.path, tmpOutput, "-v", targetVersion, "--remove-curve"],
        { stdio: "pipe", timeout: 30000 }
    );

    if (result.status !== 0) {
        const stderr = result.stderr?.toString().trim() || "unknown error";
        if (existsSync(tmpOutput)) unlinkSync(tmpOutput);
        return { status: "error", error: stderr };
    }

    if (!existsSync(tmpOutput)) {
        return { status: "error", error: "converter produced no output" };
    }

    renameSync(tmpOutput, file.path);
    return { status: "converted" };
}

// ─── Main ───

function main() {
    console.log(`\nSpine Converter: ${dryRun ? "DRY RUN" : "converting"} → ${targetVersion}\n`);

    const files = scanSpineFiles();
    const toConvert = files.filter((f) => f.category === "convert");
    const toSkip = files.filter((f) => f.category === "skip");

    console.log(`Found: ${toConvert.length} to convert, ${toSkip.length} already ≥4.x\n`);

    if (toConvert.length === 0) {
        console.log("Nothing to convert.");
        return;
    }

    if (dryRun) {
        console.log("Files to convert:");
        for (const f of toConvert) {
            console.log(`  ${f.relativePath}  (${f.version})`);
        }
        console.log(`\nFiles to skip:`);
        for (const f of toSkip) {
            console.log(`  ${f.relativePath}  (${f.version})`);
        }
        return;
    }

    // Build converter if needed
    ensureConverter();

    // Backups
    if (!noBackup) {
        createBackups(toConvert);
    }

    // Convert
    const results = [];
    for (const file of toConvert) {
        process.stdout.write(`  Converting ${file.relativePath}...`);
        const result = convertFile(file);
        results.push({ ...file, ...result });
        if (result.status === "converted") {
            process.stdout.write(" ✓\n");
        } else {
            process.stdout.write(` ✗ ${result.error}\n`);
        }
    }

    // Report
    const converted = results.filter((r) => r.status === "converted").length;
    const errors = results.filter((r) => r.status === "error").length;

    console.log("\n── Report ──────────────────────────────────────");
    console.log(`${"File".padEnd(60)} ${"From".padEnd(10)} Status`);
    console.log("─".repeat(85));

    for (const r of results) {
        const status = r.status === "converted" ? `→ ${targetVersion}` : `ERROR: ${r.error}`;
        console.log(`${r.relativePath.padEnd(60)} ${r.version.padEnd(10)} ${status}`);
    }
    for (const f of toSkip) {
        console.log(`${f.relativePath.padEnd(60)} ${f.version.padEnd(10)} skipped`);
    }

    console.log("─".repeat(85));
    console.log(`Converted: ${converted}, Skipped: ${toSkip.length}, Errors: ${errors}`);

    if (errors > 0) {
        process.exit(1);
    }
}

main();
