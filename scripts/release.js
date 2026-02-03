#!/usr/bin/env node

/**
 * Release script for onearm engine
 *
 * Usage:
 *   npm run release           # Increment patch version (0.1.4 -> 0.1.5)
 *   npm run release 0.2.0     # Set specific version
 *   npm run release minor     # Increment minor version (0.1.4 -> 0.2.0)
 *   npm run release major     # Increment major version (0.1.4 -> 1.0.0)
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

function exec(cmd) {
    return execSync(cmd, { cwd: rootDir, encoding: 'utf-8' }).trim();
}

function getCurrentVersion() {
    const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));
    return pkg.version;
}

function parseVersionArg(arg) {
    if (!arg || arg === 'patch') return 'patch';
    if (arg === 'minor') return 'minor';
    if (arg === 'major') return 'major';

    if (/^\d+\.\d+\.\d+/.test(arg)) {
        return arg;
    }

    console.error(`Invalid version argument: ${arg}`);
    console.error('Use: patch, minor, major, or a specific version (e.g., 0.2.0)');
    process.exit(1);
}

function main() {
    const versionArg = process.argv[2];
    const versionType = parseVersionArg(versionArg);

    console.log(`Current version: ${getCurrentVersion()}`);
    console.log(`Bumping version (${versionType})...\n`);

    try {
        const result = exec(`npm version ${versionType} -m "Release v%s"`);
        console.log(`✅ Released: ${result}`);
        console.log(`\nNext steps:`);
        console.log(`   git push origin main --tags`);
    } catch (e) {
        console.error('Failed to bump version:', e.message);
        process.exit(1);
    }
}

main();
