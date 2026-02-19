import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { findGameRoot } from "./scripts/utils/find-game-root.js";

const rootDir = findGameRoot();
const engineDir = path.dirname(fileURLToPath(import.meta.url));

export const baseConfig = {
    entryPoints: [path.join(rootDir, "src/Main.js")],
    bundle: true,
    outdir: path.join(rootDir, "dist"),
    format: "esm",
    target: "es2022",
    resolveExtensions: [".js", ".ts", ".json"],
    mainFields: ["module", "main"],
    conditions: ["import", "module", "default"],
    alias: {
        "gsap": path.join(engineDir, "node_modules/gsap"),
    },
    loader: {
        ".png": "file",
        ".jpg": "file",
        ".jpeg": "file",
        ".webp": "file",
        ".svg": "file",
        ".woff": "file",
        ".woff2": "file",
        ".mp3": "file",
        ".ogg": "file",
    },
    external: [],
    define: {
        "process.env.NODE_ENV": "\"development\"",
    },
    sourcemap: true,
    minify: false,
};

export const serveConfig = {
    ...baseConfig,
    define: {
        "process.env.NODE_ENV": "\"development\"",
    },
    banner: {
        js: `
                      if (typeof EventSource !== 'undefined') {
                        try { new EventSource('/esbuild').addEventListener('change', () => location.reload()); } catch (_) {}
              }
        `,
    },
};

export const prodConfig = {
    ...baseConfig,
    outdir: path.join(rootDir, "dist"),
    define: {
        "process.env.NODE_ENV": "\"production\"",
    },
    sourcemap: false,
    minify: true,
};

export const buildConfig = baseConfig;

export function copyFiles(src, dest) {
    const srcPath = path.join(rootDir, src);
    const destPath = path.join(rootDir, dest);

    if (!fs.existsSync(srcPath)) {
        console.warn(`Source directory ${srcPath} does not exist`);
        return;
    }

    fs.mkdirSync(destPath, { recursive: true });

    const copyRecursive = (source, destination) => {
        const items = fs.readdirSync(source);

        for (const item of items) {
            const sourcePath = path.join(source, item);
            const destinationPath = path.join(destination, item);

            if (fs.statSync(sourcePath).isDirectory()) {
                fs.mkdirSync(destinationPath, { recursive: true });
                copyRecursive(sourcePath, destinationPath);
            } else {
                fs.copyFileSync(sourcePath, destinationPath);
            }
        }
    };

    copyRecursive(srcPath, destPath);
}

export function copyHTMLTemplate(src, dest) {
    const srcPath = path.join(process.cwd(), src);
    const destPath = path.join(rootDir, dest);

    if (!fs.existsSync(srcPath)) {
        console.warn(`HTML template ${srcPath} does not exist`);
        return;
    }

    let htmlContent = fs.readFileSync(srcPath, 'utf8');

    // Читаем gameName из config.json
    const configPath = path.join(rootDir, 'assets/config.json');
    let gameName = 'Game';

    try {
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            gameName = config.gameName || 'Game';
        }
    } catch (error) {
        console.warn('Error reading config.json:', error.message);
    }

    // Заменяем placeholder на реальное имя игры
    htmlContent = htmlContent.replace('REPLACE TO GAME NAME', gameName);

    fs.writeFileSync(destPath, htmlContent);
}

export default baseConfig;
