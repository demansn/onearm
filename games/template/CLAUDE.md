# {{GAME_NAME}}

Game built on the [onearm](https://github.com/demansn/onearm) engine.

## Команды

```bash
npm run dev          # Dev server
npm run build        # Build
npm run build:prod   # Production build
npm run fonts        # Export fonts from Figma
npm run export       # Export assets from Figma
npm run generate-spine  # Generate Spine manifest for Figma plugin
```

## Структура проекта

```
src/
├── Main.js              # Entry point — Game.start(GameConfig)
├── configs/
│   ├── GameConfig.js    # Game configuration (services, flow, scenes, layers)
│   └── resources-manifest.js  # Auto-generated — НЕ РЕДАКТИРОВАТЬ
├── flows/               # Async flow functions (logo → preloader → main → ...)
├── scenes/              # Scenes (extend Scene or HTMLScene from onearm)
└── states/              # Game states (if using FSM)
assets/
├── config.json          # Game metadata
├── fonts/               # .ttf/.woff → logo bundle
├── sound/               # .mp3 (+.ogg fallback) → sounds bundle
├── spine/{bundle}/{alias}/  # Spine animations by bundle
├── spritesheet/{bundle}/    # Pre-made spritesheets (JSON+PNG) by bundle
└── img/{name}{tps}/         # Images for AssetPack spritesheet packing
```

## Asset Auto-Discovery

`resources-manifest.js` генерируется автоматически при `npm run dev`/`build`. Просто положи файлы в нужную директорию:

- **Шрифты**: `assets/fonts/*.ttf` → bundle `logo`, alias = имя файла без `-Regular` и т.д.
- **Звуки**: `assets/sound/*.mp3` → bundle `sounds`, alias = имя файла. `.ogg` рядом подхватывается как fallback
- **Spine**: `assets/spine/{bundle}/{alias}/` → bundle по имени папки, alias по вложенной папке
- **Спрайтшиты**: `assets/spritesheet/{bundle}/*.json` → готовые JSON+PNG спрайтшиты
- **Картинки**: `assets/img/{name}{tps}/` → паковка в spritesheet через AssetPack
- **Картинки (loose)**: `assets/img/*.png` → WebP+PNG fallback, bundle `main`

## Архитектура

- **Flows** — async функции `(scope, ctx) => Promise`, чейнятся через `return nextFlow`
- **Scenes** — PIXI контейнеры (`Scene`) или DOM-оверлеи (`HTMLScene`), управляются через `ctx.scenes.show/remove`
- **scope.defer** — cleanup при выходе из flow
- **Services** — доступ через `ctx` во flows или `this.services` в scenes

## Технологии

PIXI.js 8, GSAP 3, Spine, ES Modules, typed-signals
