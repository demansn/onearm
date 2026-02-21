import path from 'path';
import fs from 'fs';

function parseGameArg(argv: string[] = process.argv): string | null {
    const args = argv.slice(2);

    for (let i = 0; i < args.length; i += 1) {
        const arg = args[i];
        const match = arg.match(/^--?game(?:=|:)(.+)$/);

        if (match && match[1]) {
            return match[1];
        }

        if (arg === '--game' || arg === '-game') {
            return args[i + 1] || null;
        }
    }

    return null;
}

function findOnearmRoot(startDir: string = process.cwd()): string | null {
    let current = startDir;

    if (current.includes('/node_modules/onearm')) {
        const parts = current.split('/node_modules/onearm');
        return path.join(parts[0], 'node_modules', 'onearm');
    }

    while (current !== '/') {
        const pkgPath = path.join(current, 'package.json');
        if (fs.existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
                if (pkg.name === 'onearm') {
                    return current;
                }
            } catch {
                // Continue searching
            }
        }

        const parent = path.dirname(current);
        if (parent === current) break;
        current = parent;
    }

    return null;
}

function findNearestGameRoot(startDir: string = process.cwd()): string | null {
    let current = startDir;

    while (current !== '/') {
        const entryPoint = path.join(current, 'src', 'Main.js');
        if (fs.existsSync(entryPoint)) {
            return current;
        }

        const parent = path.dirname(current);
        if (parent === current) break;
        current = parent;
    }

    return null;
}

function resolveDefaultSandboxRoot(): string | null {
    const onearmRoot = findOnearmRoot();
    if (!onearmRoot) return null;

    const sandboxRoot = path.join(onearmRoot, 'games', 'sandbox');
    const entryPoint = path.join(sandboxRoot, 'src', 'Main.js');

    if (fs.existsSync(entryPoint)) {
        return sandboxRoot;
    }

    return null;
}

function resolveGameRootFromArgs(): string | null {
    const gameArg = parseGameArg() || process.env.npm_config_game || process.env.GAME;

    if (!gameArg) return null;

    const candidates: string[] = [];

    if (path.isAbsolute(gameArg)) {
        candidates.push(gameArg);
    }

    if (gameArg.startsWith('.') || gameArg.includes(path.sep)) {
        candidates.push(path.resolve(process.cwd(), gameArg));
    }

    const onearmRoot = findOnearmRoot();
    if (onearmRoot) {
        candidates.push(path.join(onearmRoot, 'games', gameArg));
    }

    for (const candidate of candidates) {
        const entryPoint = path.join(candidate, 'src', 'Main.js');
        if (fs.existsSync(entryPoint)) {
            return candidate;
        }
    }

    console.warn(`Game "${gameArg}" not found or missing src/Main.js. Falling back to auto-detect.`);
    return null;
}

export function findGameRoot(): string {
    if (process.env.GAME_ROOT) {
        return process.env.GAME_ROOT;
    }

    const gameRootFromArgs = resolveGameRootFromArgs();
    if (gameRootFromArgs) return gameRootFromArgs;

    const nearestGameRoot = findNearestGameRoot();
    if (nearestGameRoot) return nearestGameRoot;

    const defaultSandboxRoot = resolveDefaultSandboxRoot();
    if (defaultSandboxRoot) return defaultSandboxRoot;

    let current = process.cwd();
    const isOnearmPackage = (): boolean => {
        const pkgPath = path.join(current, 'package.json');
        if (fs.existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
                return pkg.name === 'onearm';
            } catch {
                return false;
            }
        }
        return false;
    };

    if (current.includes('/node_modules/onearm')) {
        const parts = current.split('/node_modules/onearm');
        return parts[0];
    }

    if (isOnearmPackage()) {
        const parentDir = path.dirname(current);
        try {
            const siblings = fs.readdirSync(parentDir, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => path.join(parentDir, dirent.name));

            for (const sibling of siblings) {
                const nodeModulesOnearm = path.join(sibling, 'node_modules', 'onearm');
                if (fs.existsSync(nodeModulesOnearm)) {
                    try {
                        const realPath = fs.realpathSync(nodeModulesOnearm);
                        if (realPath === current) {
                            const siblingPkg = path.join(sibling, 'package.json');
                            if (fs.existsSync(siblingPkg)) {
                                const pkg = JSON.parse(fs.readFileSync(siblingPkg, 'utf8'));
                                if (pkg.dependencies?.onearm || pkg.devDependencies?.onearm) {
                                    return sibling;
                                }
                            }
                        }
                    } catch {
                        // Continue searching
                    }
                }
            }
        } catch {
            // If siblings search fails
        }
    }

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
