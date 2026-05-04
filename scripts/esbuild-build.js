import esbuild from 'esbuild';
import { baseConfig as buildConfig, copyFiles } from '../esbuild.config.js';
import path from 'path';
import fs from 'fs';
import { findGameRoot } from './utils/find-game-root.js';
import { packAssets } from './pack-assets.js';
import { generateManifest } from './generate-manifest.js';
import { fileURLToPath } from 'url';
import { discoverExtraSkins, packSkin, injectSplash, injectSkinList } from './skin/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function build() {
    try {
        const gameRoot = findGameRoot();
        const staticPath = path.join(__dirname, '../static');
        const extraSkins = discoverExtraSkins(gameRoot);

        if (extraSkins.length === 0) {
            // ── CLASSIC PATH ── identical to previous behaviour
            console.log('Packing image assets...');
            await packAssets(gameRoot);

            console.log('Generating resources manifest...');
            generateManifest(gameRoot);

            console.log('Building with esbuild...');
            await esbuild.build(buildConfig);

            console.log('Copying assets...');
            copyFiles('assets', 'dist/assets', { exclude: ['img'] });

            const cssPath = path.join(staticPath, 'main.css');
            if (fs.existsSync(cssPath)) {
                fs.copyFileSync(cssPath, path.join(gameRoot, 'dist/main.css'));
            }

            const htmlPath = path.join(staticPath, 'index.html');
            if (fs.existsSync(htmlPath)) {
                const destPath = path.join(gameRoot, 'dist/index.html');
                fs.mkdirSync(path.dirname(destPath), { recursive: true });

                let htmlContent = fs.readFileSync(htmlPath, 'utf8');
                const configPath = path.join(gameRoot, 'assets/config.json');
                let gameName = 'Game';

                try {
                    if (fs.existsSync(configPath)) {
                        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                        gameName = config.gameName || 'Game';
                    }
                } catch (error) {
                    console.warn('Error reading config.json:', error.message);
                }

                htmlContent = htmlContent.replace('REPLACE TO GAME NAME', gameName);
                // Remove GSDevTools from non-dev builds
                htmlContent = htmlContent.replace(/\s*<script[^>]*GSDevTools[^>]*><\/script>/g, '');
                htmlContent = htmlContent.replace(/\s*<div id="gsap-dev-tools"><\/div>/g, '');
                fs.writeFileSync(destPath, htmlContent);
            }

            console.log('Build completed successfully!');
            return;
        }

        // ── SKIN MODE ── skins/ directory detected
        const allSkins = ['default', ...extraSkins];
        console.log(`Skin mode: packing skins [${allSkins.join(', ')}]`);

        for (const skin of allSkins) {
            await packSkin(gameRoot, skin);
        }

        // Build JS bundle (no manifest needed in src/configs — runtime fetches it)
        console.log('Building with esbuild...');
        await esbuild.build(buildConfig);

        // Copy static files to dist/ root (no dist/assets/ — runtime loads from dist/skins/<skin>/)
        const cssPath = path.join(staticPath, 'main.css');
        if (fs.existsSync(cssPath)) {
            fs.copyFileSync(cssPath, path.join(gameRoot, 'dist/main.css'));
        }

        const htmlPath = path.join(staticPath, 'index.html');
        if (fs.existsSync(htmlPath)) {
            const destPath = path.join(gameRoot, 'dist/index.html');
            fs.mkdirSync(path.dirname(destPath), { recursive: true });

            let htmlContent = fs.readFileSync(htmlPath, 'utf8');
            const configPath = path.join(gameRoot, 'assets/config.json');
            let gameName = 'Game';

            try {
                if (fs.existsSync(configPath)) {
                    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                    gameName = config.gameName || 'Game';
                }
            } catch (error) {
                console.warn('Error reading config.json:', error.message);
            }

            htmlContent = htmlContent.replace('REPLACE TO GAME NAME', gameName);
            htmlContent = htmlContent.replace(/\s*<script[^>]*GSDevTools[^>]*><\/script>/g, '');
            htmlContent = htmlContent.replace(/\s*<div id="gsap-dev-tools"><\/div>/g, '');
            fs.writeFileSync(destPath, htmlContent);
        }

        injectSplash(gameRoot);
        injectSkinList(gameRoot, allSkins);

        console.log('Build completed successfully!');
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

build();
