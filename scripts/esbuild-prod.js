import esbuild from 'esbuild';
import { prodConfig, copyFiles, copyHTMLTemplate } from '../esbuild.config.js';
import path from 'path';
import fs from 'fs';

async function build() {
    try {
        console.log('Building production with esbuild...');

        await esbuild.build(prodConfig);

        console.log('Copying assets...');
        copyFiles('assets', 'dist/assets');
        fs.copyFileSync('static/main.css', '../../dist/main.css');
        copyHTMLTemplate('static/index.html', 'dist/index.html');

        console.log('Production build completed successfully!');
    } catch (error) {
        console.error('Production build failed:', error);
        process.exit(1);
    }
}

build();
