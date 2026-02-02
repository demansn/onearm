#!/usr/bin/env python3
import os
import re

def fix_imports_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    pattern = r'(from\s+["\'])(\.\.?/[^"\']+?)(["\'])'
    
    def replacer(match):
        prefix = match.group(1)
        path = match.group(2)
        suffix = match.group(3)
        
        if path.endswith('.js') or path.endswith('.json') or path.endswith('.css'):
            return match.group(0)
        
        return f'{prefix}{path}.js{suffix}'
    
    content = re.sub(pattern, replacer, content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    fixed_count = 0
    for root, dirs, files in os.walk('modules'):
        for file in files:
            if file.endswith('.js'):
                filepath = os.path.join(root, file)
                if fix_imports_in_file(filepath):
                    fixed_count += 1
                    print(f'Fixed: {filepath}')
    
    print(f'\nTotal files fixed: {fixed_count}')

if __name__ == '__main__':
    main()
