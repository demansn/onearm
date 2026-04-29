import esbuild from 'esbuild';
import { prodConfig, copyFiles } from '../esbuild.config.js';
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
            // ── CLASSIC PATH ──
            console.log('Packing image assets...');
            await packAssets(gameRoot);

            console.log('Building production with esbuild...');
            await esbuild.build(prodConfig);

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
                // Remove GSDevTools from production builds
                htmlContent = htmlContent.replace(/\s*<script[^>]*GSDevTools[^>]*><\/script>/g, '');
                htmlContent = htmlContent.replace(/\s*<div id="gsap-dev-tools"><\/div>/g, '');
                fs.writeFileSync(destPath, htmlContent);
            }

            console.log('Production build completed successfully!');
            return;
        }

        // ── SKIN MODE ──
        const allSkins = ['default', ...extraSkins];
        console.log(`Skin mode: packing skins [${allSkins.join(', ')}]`);

        for (const skin of allSkins) {
            await packSkin(gameRoot, skin);
        }

        console.log('Building production with esbuild...');
        await esbuild.build(prodConfig);

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

        console.log('Production build completed successfully!');
    } catch (error) {
        console.error('Production build failed:', error);
        process.exit(1);
    }
}

build();
