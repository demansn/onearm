import path from "path";
import fs from "fs";

function findGameRoot() {
    if (process.env.GAME_ROOT) {
        return process.env.GAME_ROOT;
    }

    let current = process.cwd();
    const isOnearmPackage = () => {
        const pkgPath = path.join(current, 'package.json');
        if (fs.existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
                return pkg.name === 'onearm';
            } catch (e) {
                return false;
            }
        }
        return false;
    };
    
    // Если мы внутри node_modules/onearm (реальная папка)
    if (current.includes('/node_modules/onearm')) {
        const parts = current.split('/node_modules/onearm');
        return parts[0];
    }
    
    // Если это сам onearm пакет (через npm link)
    if (isOnearmPackage()) {
        // Ищем родительскую директорию и папку с симлинком
        const parentDir = path.dirname(current);
        
        // Ищем все соседние директории
        try {
            const siblings = fs.readdirSync(parentDir, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => path.join(parentDir, dirent.name));
            
            for (const sibling of siblings) {
                const nodeModulesOnearm = path.join(sibling, 'node_modules', 'onearm');
                
                // Проверяем что это симлинк на текущую директорию
                if (fs.existsSync(nodeModulesOnearm)) {
                    try {
                        const realPath = fs.realpathSync(nodeModulesOnearm);
                        if (realPath === current) {
                            // Проверяем что sibling это игровой проект
                            const siblingPkg = path.join(sibling, 'package.json');
                            if (fs.existsSync(siblingPkg)) {
                                const pkg = JSON.parse(fs.readFileSync(siblingPkg, 'utf8'));
                                if (pkg.dependencies?.onearm || pkg.devDependencies?.onearm) {
                                    return sibling;
                                }
                            }
                        }
                    } catch (e) {
                        // Продолжаем поиск
                    }
                }
            }
        } catch (e) {
            // Если не удалось найти через siblings
        }
    }
    
    // Ищем вверх по дереву (стандартная установка)
    while (current !== '/') {
        if (fs.existsSync(path.join(current, 'node_modules', 'onearm'))) {
            return current;
        }
        if (fs.existsSync(path.join(current, 'package.json'))) {
            const pkg = JSON.parse(fs.readFileSync(path.join(current, 'package.json'), 'utf8'));
            if (pkg.dependencies?.onearm || pkg.devDependencies?.onearm) {
                return current;
            }
        }
        const parent = path.dirname(current);
        if (parent === current) break;
        current = parent;
    }
    
    return process.cwd();
}

const rootDir = findGameRoot();

export const baseConfig = {
    entryPoints: [path.join(rootDir, "src/Main.js")],
    bundle: true,
    outdir: path.join(rootDir, "dist"),
    format: "esm",
    target: "es2020",
    resolveExtensions: [".js", ".ts", ".json"],
    mainFields: ["module", "main"],
    conditions: ["import", "module", "default"],
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
