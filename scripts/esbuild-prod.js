import esbuild from 'esbuild';
import { prodConfig, copyFiles, copyHTMLTemplate } from '../esbuild.config.js';
import path from 'path';
import fs from 'fs';
import { findGameRoot } from './utils/find-game-root.js';

async function build() {
    try {
        console.log('Building production with esbuild...');

        await esbuild.build(prodConfig);

        const gameRoot = findGameRoot();
        console.log('Copying assets...');
        copyFiles('assets', 'dist/assets');
        
        const staticCssPath = path.join(process.cwd(), 'static/main.css');
        if (fs.existsSync(staticCssPath)) {
            fs.copyFileSync(staticCssPath, path.join(gameRoot, 'dist/main.css'));
        }
        
        copyHTMLTemplate('static/index.html', 'dist/index.html');

        console.log('Production build completed successfully!');
    } catch (error) {
        console.error('Production build failed:', error);
        process.exit(1);
    }
}

build();
