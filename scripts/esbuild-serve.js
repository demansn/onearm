import esbuild from 'esbuild';
import { serveConfig, copyFiles, copyHTMLTemplate } from '../esbuild.config.js';
import path from 'path';
import fs from 'fs';

function createAssetsWatchPlugin(getContext) {
    let assetsWatcher = null;
    let staticWatcher = null;
    let isWatching = false;

    return {
        name: 'assets-watch',
        setup(build) {
            const rootDir = path.resolve(process.cwd(), '../..');
            const assetsPath = path.join(rootDir, 'assets');
            const staticPath = path.join(process.cwd(), 'static');

            build.onStart(() => {
                console.log('Copying assets...');
                                                                copyFiles('assets', 'dist/assets');

                if (fs.existsSync(path.join(staticPath, 'main.css'))) {
                    fs.copyFileSync(path.join(staticPath, 'main.css'), path.join(rootDir, 'dist/main.css'));
                }

                copyHTMLTemplate('static/index.html', 'dist/index.html');

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
                                if (filename.endsWith('.css')) {
                                    fs.copyFileSync(path.join(staticPath, filename), path.join(rootDir, 'dist', filename));
                                } else if (filename.endsWith('.html')) {
                                    copyHTMLTemplate(`static/${filename}`, `build/${filename}`);
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

        await context.serve({
            servedir: path.join(process.cwd(), '../../dist'),
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
