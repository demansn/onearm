# {{GAME_NAME}}

Game built on the [onearm](https://github.com/demansn/onearm) engine.

## Команды

```bash
npm run dev          # Dev server
npm run build        # Build
npm run build:prod   # Production build
npm run fonts        # Export fonts from Figma
npm run export       # Export images from Figma
npm run export:components  # Export layout components (components.config.json)
npm run oauth        # Figma OAuth setup (once)
npm run spine-preview      # Spine animation previewer
npm run plinko-record      # Record Plinko trajectories (src/configs/plinko-board.js)
```

Figma-команды читают `.env` в корне игры: `FILE_KEY`, `FIGMA_CLIENT_ID`, `FIGMA_CLIENT_SECRET`. Токены кэшируются в `.figma-tokens.json` (gitignored).

## Структура проекта

```
src/
├── Main.js              # Entry point — Game.start(GameConfig)
├── configs/
│   ├── GameConfig.js    # Game configuration (services, flow, scenes, layers)
│   ├── plinko-board.js  # Plinko board geometry + physics preset
│   └── resources-manifest.js  # Auto-generated — НЕ РЕДАКТИРОВАТЬ
├── flows/               # Async flow functions (logo → preloader → main → ...)
└── scenes/              # Scenes (extend Scene or HTMLScene from onearm)
assets/
├── config.json          # Game metadata
├── components.config.json  # Layout config, exported from Figma
├── bitmap-fonts/        # .fnt/.xml bitmap fonts → logo bundle
├── fonts/               # .ttf/.woff → logo bundle
├── sound/               # .mp3 (+.ogg fallback) → sounds bundle
├── spine/{bundle}/{dir}/    # Spine skeletons by bundle, alias = skeleton filename
├── spritesheet/{bundle}/    # Pre-made spritesheets (JSON+PNG) by bundle
└── img/{name}{tps}/         # Images for AssetPack spritesheet packing
```

## Asset Auto-Discovery

`resources-manifest.js` генерируется автоматически при `npm run dev`/`build`. Просто положи файлы в нужную директорию:

- **Шрифты**: `assets/fonts/*.ttf` → bundle `logo`, alias = имя файла без `-Regular` и т.д.
- **Звуки**: `assets/sound/*.mp3` → bundle `sounds`, alias = имя файла. `.ogg` рядом подхватывается как fallback
- **Spine**: `assets/spine/{bundle}/{dir}/` → bundle по имени папки, alias = имя файла скелета (`{name}Data` + `{name}Atlas`). Несколько скелетов с общим атласом в одной папке допустимы
- **Bitmap-шрифты**: `assets/bitmap-fonts/*` → bundle `logo`, alias = имя файла
- **Сцены**: `assets/scenes/*.json` → bundle `logo`, alias `scene.<name>`
- **Спрайтшиты**: `assets/spritesheet/{bundle}/*.json` → готовые JSON+PNG спрайтшиты
- **Картинки**: `assets/img/{name}{tps}/` → паковка в spritesheet через AssetPack
- **Картинки (loose)**: `assets/img/*.png` → WebP+PNG fallback, bundle `main`
- **Plinko**: `assets/plinko/<theme>/pocket-*.json` → bundle `plinko-<theme>`, alias = имя файла

## Архитектура

- **Flows** — async функции `(scope, ctx) => Promise`, чейнятся через `return nextFlow`
- **Scenes** — PIXI контейнеры (`Scene`) или DOM-оверлеи (`HTMLScene`), управляются через `ctx.scenes.show/remove`
- **scope.defer** — cleanup при выходе из flow
- **Services** — доступ через `ctx` во flows или `this.services` в scenes
- **Animation Clips** — переиспользуемые GSAP-анимации. Подменяются через `GameConfig.animations`. Подробнее: `docs/animation-clips.md` в onearm
- **Plinko** — предзаписанные физические траектории для Plinko (рекордер → JSON → GSAP playback). Board config в `src/configs/plinko-board.js`, документация: `docs/plinko-physics-recordings.md` в onearm

## Технологии

PIXI.js 8, GSAP 3, Spine, ES Modules, typed-signals
