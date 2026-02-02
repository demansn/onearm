import esbuild from 'esbuild';
import { baseConfig as buildConfig, copyFiles, copyHTMLTemplate } from '../esbuild.config.js';
import path from 'path';
import fs from 'fs';

async function build() {
    try {
        console.log('Building with esbuild...');

        await esbuild.build(buildConfig);

        console.log('Copying assets...');
        copyFiles('assets', 'dist/assets');
        fs.copyFileSync('static/main.css', '../../dist/main.css');
        copyHTMLTemplate('static/index.html', 'dist/index.html');

        console.log('Build completed successfully!');
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

build();
