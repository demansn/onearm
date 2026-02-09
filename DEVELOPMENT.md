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

### Быстрый старт

```bash
# 1. Клонировать и подключить onearm (в любой папке рядом с игрой)
cd ~/projects
git clone git@github.com:demansn/onearm.git
cd onearm
npm install
npm link

# 2. Подключить к игре
cd ~/projects/sweet-bonanza
npm link onearm

# 3. Запустить dev-сервер
npm run start
```

**Важно:** Движок должен находиться в соседней директории с игрой (например, `~/projects/onearm` и `~/projects/sweet-bonanza`). Система автоматически определит путь к игре через симлинк.

### Разработка

**ВАЖНО:** Все команды сборки и запуска выполняются **из директории игры**, а не из onearm!

После подключения все изменения в `~/projects/onearm` сразу доступны в игре:

```bash
# ✅ ПРАВИЛЬНО - команды из игры
cd ~/projects/sweet-bonanza
npm run start      # dev-сервер с hot reload
npm run build      # обычная сборка
npm run build:prod # production сборка

# ❌ НЕПРАВИЛЬНО - не запускай команды из onearm напрямую без sandbox
cd ~/projects/onearm
npm run dev        # ❌ Не найдет игровой проект

# ✅ МОЖНО - запуск sandbox игры из onearm
npm run dev -- -game=sandbox

# ✅ Редактирование и коммиты движка
cd ~/projects/onearm
# вносите изменения в код движка
git add .
git commit -m "fix: описание"
git push
```

**Почему так?** Команды сборки должны знать где находится игровой проект (src/, assets/, dist/). Система автоматически определит это через симлинк, но только если запускать команды из директории игры.

### Sandbox игры (запуск из onearm)

Для разработки движка без внешней игры используйте sandbox проекты в `games/`.

```bash
cd ~/projects/onearm
npm run dev -- -game=sandbox
```

Аргумент `-game` ищет папку `games/<name>` и ожидает `src/Main.js` и `assets/`.

### Возврат к git-версии

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
