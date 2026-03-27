import esbuild from 'esbuild';
import { serveConfig, copyFiles, copyHTMLTemplate, engineDir } from '../esbuild.config.js';
import path from 'path';
import fs from 'fs';
import net from 'net';
import os from 'os';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { findGameRoot } from './utils/find-game-root.js';
import { packAssets } from './pack-assets.js';
import { generateManifest } from './generate-manifest.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const iface of Object.values(interfaces)) {
        for (const info of iface) {
            if (info.family === 'IPv4' && !info.internal) {
                return info.address;
            }
        }
    }
    return null;
}

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

            build.onStart(async () => {
                // Re-pack images if packed output is missing (e.g. dist was cleaned)
                const packedMarker = path.join(gameRoot, 'dist', 'assets', 'img', 'manifest.json');
                if (!fs.existsSync(packedMarker)) {
                    console.log('Packed images missing, re-packing...');
                    await packAssets(gameRoot);
                }

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

                            try {
                                const isImg = filename.startsWith('img' + path.sep) || filename.startsWith('img/');
                                const isManifestAsset = ['sound', 'spine', 'fonts', 'img', 'spritesheet'].some(
                                    (dir) => filename.startsWith(dir + path.sep) || filename.startsWith(dir + '/'),
                                );

                                if (isManifestAsset) {
                                    console.log('Regenerating resources manifest...');
                                    generateManifest(gameRoot);
                                }

                                if (isImg) {
                                    console.log('Repacking image assets...');
                                    await packAssets(gameRoot);
                                } else {
                                    console.log('Recopying assets...');
                                    copyFiles('assets', 'dist/assets', { exclude: ['img'] });
                                }
                                console.log('Assets updated successfully');

                                const context = getContext();
                                if (context) {
                                    await context.rebuild();
                                    console.log('Page reloaded');
                                }
                            } catch (error) {
                                console.error('Error updating assets:', error);
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

        const gameRoot = findGameRoot();
        console.log(`Game root: ${gameRoot}`);

        console.log('Generating resources manifest...');
        generateManifest(gameRoot);

        console.log('Packing image assets...');
        await packAssets(gameRoot);

        let context;

        const configWithAssetWatch = {
            ...serveConfig,
            plugins: [
                ...(serveConfig.plugins || []),
                createAssetsWatchPlugin(() => context)
            ]
        };

        // --spine-preview: override entry point to spine previewer
        const args = process.argv.slice(2);
        const isSpinePreview = args.includes('--spine-preview');

        if (isSpinePreview) {
            configWithAssetWatch.entryPoints = [
                path.join(engineDir, 'modules/engine/tools/spine-preview/Main.js')
            ];
            configWithAssetWatch.alias = {
                ...configWithAssetWatch.alias,
                'game-manifest': path.join(gameRoot, 'src/configs/resources-manifest.js'),
            };
        }

        context = await esbuild.context(configWithAssetWatch);

        await context.watch();

        const host = process.env.HOST || "0.0.0.0";
        const requestedPort = parseInt(process.env.PORT, 10) || 9000;

        const port = await findAvailablePort(requestedPort, host);

        await context.serve({
            servedir: path.join(gameRoot, 'dist'),
            host: host,
            port: port,
        });

        const enginePkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));
        let gamePkg = { name: path.basename(gameRoot), version: '0.0.0' };
        try {
            gamePkg = JSON.parse(fs.readFileSync(path.join(gameRoot, 'package.json'), 'utf-8'));
        } catch (_) {}

        const openHost = host === '0.0.0.0' ? 'localhost' : host;

        console.log('');
        console.log(`  ${gamePkg.name}@${gamePkg.version} | onearm@${enginePkg.version}`);
        if (isSpinePreview) console.log('  Mode:    Spine Previewer');
        console.log('');
        console.log(`  Local:   http://${openHost}:${port}`);

        if (host === '0.0.0.0') {
            const localIP = getLocalIP();
            if (localIP) {
                console.log(`  Network: http://${localIP}:${port}`);
            }
        }

        console.log('');
        console.log('Watching for changes in assets/ and static/ directories...');

        // --watch-components: poll Figma for component changes
        if (args.includes('--watch-components')) {
            const figmaCli = path.join(__dirname, '..', 'bin', 'onearm-figma.js');
            const intervalArg = args.find(a => a.startsWith('--figma-interval='));
            const childArgs = ['export-components', '--watch'];
            if (intervalArg) childArgs.push(intervalArg.replace('--figma-interval=', '--interval='));

            const child = spawn('node', [figmaCli, ...childArgs], {
                stdio: 'inherit',
                cwd: gameRoot,
            });

            child.on('error', (err) => console.error('Figma watch error:', err.message));

            process.on('SIGINT', () => { child.kill(); process.exit(0); });
            process.on('SIGTERM', () => { child.kill(); });

            console.log('Watching Figma components for changes...');
        }
    } catch (error) {
        console.error('Dev server failed:', error);
        process.exit(1);
    }
}

serve();

async function findAvailablePort(startPort, host, maxAttempts = 50) {
    let port = startPort;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const available = await isPortAvailable(port, host);
        if (available) {
            if (port !== startPort) {
                console.log(`Port ${startPort} is in use, switching to ${port}`);
            }
            return port;
        }
        port += 1;
    }

    throw new Error(`No available port found starting at ${startPort}`);
}

function isPortAvailable(port, host) {
    return new Promise((resolve) => {
        const server = net.createServer();

        server.once('error', (error) => {
            if (error.code === 'EADDRINUSE' || error.code === 'EACCES') {
                resolve(false);
            } else {
                resolve(false);
            }
        });

        server.once('listening', () => {
            server.close(() => resolve(true));
        });

        server.listen(port, host);
    });
}
