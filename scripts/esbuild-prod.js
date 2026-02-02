import esbuild from 'esbuild';
import { prodConfig, copyFiles } from '../esbuild.config.js';
import path from 'path';
import fs from 'fs';
import { findGameRoot } from './utils/find-game-root.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function build() {
    try {
        console.log('Building production with esbuild...');

        await esbuild.build(prodConfig);

        const gameRoot = findGameRoot();
        const staticPath = path.join(__dirname, '../static');
        
        console.log('Copying assets...');
        copyFiles('assets', 'dist/assets');
        
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
            fs.writeFileSync(destPath, htmlContent);
        }

        console.log('Production build completed successfully!');
    } catch (error) {
        console.error('Production build failed:', error);
        process.exit(1);
    }
}

build();
