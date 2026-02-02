import path from 'path';
import fs from 'fs';

export function findGameRoot() {
    let current = process.cwd();
    
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
