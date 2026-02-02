import esbuild from 'esbuild';
import { serveConfig, copyFiles, copyHTMLTemplate } from '../esbuild.config.js';
import path from 'path';
import fs from 'fs';
import { findGameRoot } from './utils/find-game-root.js';

function createAssetsWatchPlugin(getContext) {
    let assetsWatcher = null;
    let staticWatcher = null;
    let isWatching = false;
    
    const gameRoot = findGameRoot();

    return {
        name: 'assets-watch',
        setup(build) {
            const assetsPath = path.join(gameRoot, 'assets');
            const staticPath = path.join(path.dirname(new URL(import.meta.url).pathname), '../static');

            build.onStart(() => {
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

                // Закрываем старые watchers если они существуют
                if (assetsWatcher) {
                    assetsWatcher.close();
                    assetsWatcher = null;
                }
                if (staticWatcher) {
                    staticWatcher.close();
                    staticWatcher = null;
                }
            });

            build.onEnd(() => {
                // Создаем watchers только один раз
                if (isWatching) return;
                isWatching = true;

                if (fs.existsSync(assetsPath)) {
                    assetsWatcher = fs.watch(assetsPath, { recursive: true }, async (eventType, filename) => {
                        if (filename) {
                            console.log(`Assets changed: ${filename}`);
                            console.log('Recopying assets...');

                            try {
                                copyFiles('assets', 'dist/assets');
                                console.log('Assets updated successfully');

                                // Принудительно перестраиваем через rebuild
                                const context = getContext();
                                if (context) {
                                    await context.rebuild();
                                    console.log('Page reloaded');
                                }
                            } catch (error) {
                                console.error('Error copying assets:', error);
                            }
                        }
                    });
                }

                if (fs.existsSync(staticPath)) {
                    staticWatcher = fs.watch(staticPath, { recursive: true }, async (eventType, filename) => {
                        if (filename && (filename.endsWith('.css') || filename.endsWith('.html'))) {
                            console.log(`Static file changed: ${filename}`);

                            try {
                                const sourcePath = path.join(staticPath, filename);
                                const destPath = path.join(gameRoot, 'dist', filename);
                                
                                if (filename.endsWith('.css')) {
                                    fs.copyFileSync(sourcePath, destPath);
                                } else if (filename.endsWith('.html')) {
                                    let htmlContent = fs.readFileSync(sourcePath, 'utf8');
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
                                console.log(`${filename} updated successfully`);

                                // Принудительно перестраиваем через rebuild
                                const context = getContext();
                                if (context) {
                                    await context.rebuild();
                                    console.log('Page reloaded');
                                }
                            } catch (error) {
                                console.error(`Error copying ${filename}:`, error);
                            }
                        }
                    });
                }

                const cleanup = () => {
                    if (assetsWatcher) {
                        assetsWatcher.close();
                        assetsWatcher = null;
                    }
                    if (staticWatcher) {
                        staticWatcher.close();
                        staticWatcher = null;
                    }
                    isWatching = false;
                };

                process.on('SIGINT', () => {
                    cleanup();
                    process.exit(0);
                });

                process.on('SIGTERM', cleanup);
            });
        },
    };
}

async function serve() {
    try {
        console.log('Starting esbuild dev server...');

        let context;

        const configWithAssetWatch = {
            ...serveConfig,
            plugins: [
                ...(serveConfig.plugins || []),
                createAssetsWatchPlugin(() => context)
            ]
        };

        context = await esbuild.context(configWithAssetWatch);

        await context.watch();

        const host = process.env.HOST || "0.0.0.0";
        const port = parseInt(process.env.PORT) || 9000;
        const gameRoot = findGameRoot();

        await context.serve({
            servedir: path.join(gameRoot, 'dist'),
            host: host,
            port: port,
        });

        console.log(`Dev server started at http://${host}:${port}`);
        console.log('Watching for changes in assets/ and static/ directories...');
    } catch (error) {
        console.error('Dev server failed:', error);
        process.exit(1);
    }
}

serve();
