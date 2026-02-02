import path from 'path';
import fs from 'fs';

export function findGameRoot() {
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
