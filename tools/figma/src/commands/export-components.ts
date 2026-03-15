import fs from 'fs';
import path from 'path';
import { FigmaAuth } from '../auth/FigmaAuth.js';
import { FigmaClient } from '../api/FigmaClient.js';
import { findGameRoot } from '../utils/find-game-root.js';
import { RestDocumentProvider } from '../adapters/rest/RestDocumentProvider';
import { ExportPipeline } from '../core/ExportPipeline';

const DEFAULT_POLL_INTERVAL = 5000;

export async function run(args: string[]): Promise<void> {
    const gameRoot = findGameRoot();
    const fileKey = process.env.FILE_KEY;

    if (!fileKey) {
        console.error('FILE_KEY is not set in .env');
        process.exit(1);
    }

    const auth = new FigmaAuth();
    const client = new FigmaClient(auth);
    const outputDir = path.join(gameRoot, 'assets');

    console.log('Checking OAuth authorization...');
    await auth.getValidToken();
    console.log('OAuth authorization OK\n');

    await exportComponents(client, fileKey, outputDir);

    const isWatch = args.includes('--watch');
    if (!isWatch) return;

    const intervalArg = args.find(a => a.startsWith('--interval='));
    const interval = intervalArg ? parseInt(intervalArg.split('=')[1], 10) : DEFAULT_POLL_INTERVAL;

    let lastModified = await client.getLastModified(fileKey);
    console.log(`\nWatching Figma file for changes (every ${interval / 1000}s)...`);
    console.log('Press Ctrl+C to stop.\n');

    setInterval(async () => {
        try {
            const current = await client.getLastModified(fileKey);
            if (current !== lastModified) {
                lastModified = current;
                console.log(`\nFigma file changed (${new Date().toLocaleTimeString()}), re-exporting...`);
                await exportComponents(client, fileKey, outputDir);
            }
        } catch (error: any) {
            console.error(`Poll error: ${error.message}`);
        }
    }, interval);
}

async function exportComponents(client: FigmaClient, fileKey: string, outputDir: string): Promise<void> {
    console.log('Fetching Figma file...');
    const fileData = await client.fetchFile(fileKey);

    const provider = new RestDocumentProvider(fileData);
    const pipeline = new ExportPipeline({
        documentProvider: provider,
        onProgress: (message) => console.log(message)
    });

    console.log('Processing components...');
    const result = pipeline.run('layouts');

    const config = {
        ...result,
        metadata: {
            ...result.metadata,
            figmaFileKey: fileKey
        }
    };

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const jsonPath = path.join(outputDir, 'components.config.json');
    await fs.promises.writeFile(jsonPath, JSON.stringify(config, null, 2));

    const stats = result.metadata?.statistics;
    console.log(`\nComponents config saved: ${jsonPath}`);
    console.log(`\nExport statistics:`);
    console.log(`  Total components: ${stats?.totalComponents ?? 0}`);
    console.log(`  With variants: ${stats?.componentsWithVariants ?? 0}`);
    console.log(`  Without variants: ${stats?.componentsWithoutVariants ?? 0}`);

    if (stats?.variantsByViewport) {
        console.log(`\nVariants by viewport:`);
        Object.entries(stats.variantsByViewport).forEach(([viewport, count]) => {
            if ((count as number) > 0) console.log(`  ${viewport}: ${count}`);
        });
    }

    console.log('\nExport complete!');
}
