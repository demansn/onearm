import dotenv from 'dotenv';
import path from 'path';
import { findGameRoot } from './utils/find-game-root.js';

const gameRoot = findGameRoot();
dotenv.config({ path: path.join(gameRoot, '.env') });

const COMMANDS: Record<string, () => Promise<{ run: (args: string[]) => Promise<void> }>> = {
    'export-images':     () => import('./commands/export-images.js'),
    'export-fonts':      () => import('./commands/export-fonts.js'),
    'export-components': () => import('./commands/export-components.js'),
    'oauth-setup':       () => import('./commands/oauth-setup.js'),
    'oauth-check':       () => import('./commands/oauth-check.js'),
};

function showHelp(): void {
    console.log('onearm-figma - Figma tools for onearm engine\n');
    console.log('Usage: onearm-figma <command> [options]\n');
    console.log('Commands:');
    console.log('  export-images      Export images from Figma');
    console.log('  export-fonts       Export font styles from Figma');
    console.log('  export-components  Export component layouts from Figma');
    console.log('  oauth-setup        Setup OAuth authorization');
    console.log('  oauth-check        Check OAuth configuration');
    console.log('\nOptions:');
    console.log('  --help, -h         Show help');
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command || command === '--help' || command === '-h') {
        showHelp();
        return;
    }

    const loader = COMMANDS[command];
    if (!loader) {
        console.error(`Unknown command: ${command}`);
        console.log('Run "onearm-figma --help" for available commands');
        process.exit(1);
    }

    const commandArgs = args.slice(1);

    try {
        const mod = await loader();
        await mod.run(commandArgs);
    } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

main();
