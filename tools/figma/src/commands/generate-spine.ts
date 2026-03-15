import fs from 'fs';
import path from 'path';
import { findGameRoot } from '../utils/find-game-root.js';
import { scanSpineAssets } from '../spine/scanSpineAssets.js';

export async function run(args: string[]): Promise<void> {
    const gameRoot = findGameRoot();
    const assetsDir = path.join(gameRoot, 'assets');

    if (!fs.existsSync(assetsDir)) {
        console.error(`Assets directory not found: ${assetsDir}`);
        process.exit(1);
    }

    console.log(`Scanning Spine assets in ${assetsDir}/spine/...`);

    const manifest = scanSpineAssets(assetsDir);

    // Determine output path
    let outputPath: string | undefined;
    for (const arg of args) {
        const match = arg.match(/^--output=(.+)$/);
        if (match) outputPath = match[1];
    }

    if (!outputPath) {
        const outputDir = path.join(gameRoot, 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        outputPath = path.join(outputDir, 'spine-manifest.json');
    }

    fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

    // Summary
    const total = manifest.spines.length;
    const binaryCount = manifest.spines.filter(s => s.isBinary).length;
    const totalAnimations = manifest.spines.reduce((sum, s) => sum + s.animations.length, 0);
    const bundles = [...new Set(manifest.spines.map(s => s.bundle))];

    console.log(`\nFound ${total} spine skeleton(s) in ${bundles.length} bundle(s): ${bundles.join(', ')}`);
    console.log(`Total animations: ${totalAnimations}`);
    if (binaryCount > 0) {
        console.log(`Binary (.skel) skeletons without metadata: ${binaryCount}`);
    }
    console.log(`\nManifest saved to: ${outputPath}`);
}
