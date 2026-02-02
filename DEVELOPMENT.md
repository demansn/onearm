# Работа с движком Onearm

Движок находится в отдельном репозитории: `git@github.com:demansn/onearm.git`

## Production режим (обычная разработка игры)

Движок устанавливается автоматически как npm git-пакет:

```bash
npm install
npm run start  # запуск dev-сервера
```

## Development режим (разработка движка)

Когда нужно вносить изменения в движок одновременно с игрой:

### 1. Клонировать движок локально

```bash
cd ~/projects  # или любая другая папка
git clone git@github.com:demansn/onearm.git
cd onearm
npm install
```

### 2. Создать глобальный симлинк

```bash
npm link
```

### 3. Подключить локальный движок к игре

```bash
cd ~/projects/sweet-bonanza
npm link onearm
```

Теперь игра использует локальную версию движка. Все изменения в `~/projects/onearm` будут сразу доступны.

### 4. Разработка

```bash
# В терминале игры
npm run start  # dev-сервер с hot reload

# В терминале движка (опционально для дебага)
cd ~/projects/onearm
# можно вносить изменения и коммитить
```

### 5. Возврат к git-версии

Когда закончили работу над движком:

```bash
cd ~/projects/sweet-bonanza
npm unlink onearm
npm install --force  # переустанавливает из github
```

## Коммиты в движок

После внесения изменений в локальную версию движка:

```bash
cd ~/projects/onearm
git add .
git commit -m "описание изменений"
git push origin main
```

Затем в игре обновить версию:

```bash
cd ~/projects/sweet-bonanza
npm install --force  # подтянет последние изменения из github
```

## Структура onearm

```
onearm/
├── modules/
│   ├── engine/     # Core движок (PIXI.js, сервисы, UI)
│   │   └── index.js
│   └── slots/      # Логика слотов (барабаны, acts, states)
│       └── index.js
├── scripts/        # Build скрипты
├── static/         # HTML template
└── index.js        # Главный экспорт
```

## Импорты

```javascript
// Импорт из главного файла (рекомендуется)
import { Game, Scene, BaseGameState, Reels } from 'onearm';

// Или из конкретных модулей
import { Game } from 'onearm/engine';
import { BaseGameState } from 'onearm/slots';
```
