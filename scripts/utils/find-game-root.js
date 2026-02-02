import path from 'path';
import fs from 'fs';

export function findGameRoot() {
    if (process.env.GAME_ROOT) {
        return process.env.GAME_ROOT;
    }

    let current = process.cwd();
    
    // Если мы внутри node_modules/onearm, поднимаемся на два уровня вверх
    if (current.includes('/node_modules/onearm')) {
        const parts = current.split('/node_modules/onearm');
        return parts[0];
    }
    
    // Иначе ищем вверх по дереву
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
