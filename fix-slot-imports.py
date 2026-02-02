import os
import re

for root, dirs, files in os.walk('modules/slots'):
    for file in files:
        if file.endswith('.js'):
            filepath = os.path.join(root, file)
            
            with open(filepath, 'r') as f:
                content = f.read()
            
            # Вычисляем глубину вложенности
            relative_path = os.path.relpath(filepath, 'modules/slots')
            depth = relative_path.count(os.sep)
            
            # Создаем правильный относительный путь
            if depth == 0:
                # Файл в корне slots/
                engine_path = '../engine/index.js'
            else:
                # Файл в подпапке
                engine_path = '../' * (depth + 1) + 'engine/index.js'
            
            # Заменяем импорты
            new_content = content.replace('from "../engine/index.js"', f'from "{engine_path}"')
            
            if new_content != content:
                with open(filepath, 'w') as f:
                    f.write(new_content)
                print(f'Fixed: {filepath} -> {engine_path}')

print('Done!')
