# Asset Pipeline

## Обзор

Пайплайн ассетов использует `@assetpack/core` (официальный инструмент PixiJS) для упаковки изображений в спрайтшиты с WebP-компрессией.

## Пайплайн

```
Figma export → assets/img/ → AssetPack → dist/assets/img/
```

### Шаг 1: Экспорт из Figma

- `onearm-figma export-images` скачивает PNG из Figma
- Страница Images в Figma содержит ноды с префиксом `path/`, которые создают директории
- Имена папок берутся AS-IS из имён нод Figma (например, `path/main{tps}` создаёт `assets/img/main{tps}/`)
- Каждая дочерняя нода = один PNG-файл, alias = имя ноды

### Шаг 2: AssetPack (`scripts/pack-assets.js`)

- Вход: `assets/img/`, выход: `dist/assets/img/`
- Использует `pixiPipes()` с пайпами texturePacker, compression (webp), manifest
- Тег `{tps}` на имени папки — все PNG внутри пакуются в один spritesheet-атлас
- Файлы без `{tps}` — конвертируются в WebP, PNG остаётся как fallback
- Генерирует `manifest.json` для PIXI.Assets (пока не используется напрямую)
- Постобработка JSON спрайтшитов: убирает расширения файлов из имён фреймов (workaround для бага AssetPack)
- Конфиг: `cacheBust: false`, `resolutions: { default: 1 }`, `allowRotation: false`

### Шаг 3: Интеграция в билд

Порядок сборки: `packAssets()` → `esbuild` → `copyFiles(exclude: img)`

- pack-assets запускается ПЕРВЫМ, чтобы файлы спрайтшитов существовали до esbuild
- copyFiles пропускает директорию `img/`, так как она обрабатывается pack-assets
- Dev watcher: изменения в `assets/img/` запускают re-pack, остальные ассеты — re-copy

## Структура папок

```
assets/img/                    <- вход AssetPack
├── main{tps}/                 <- {tps} = пакуется в spritesheet
│   ├── BallA.png
│   ├── PlayBtn.png
│   └── ...
└── desktop_bg.png             <- без {tps} = отдельный файл, конвертируется в WebP

dist/assets/img/               <- выход AssetPack
├── main.webp                  <- текстура атласа (WebP)
├── main.webp.json             <- метаданные spritesheet (фреймы без расширений)
├── main.png                   <- PNG fallback
├── main.png.json              <- PNG spritesheet metadata
├── desktop_bg.webp            <- конвертирован в WebP
├── desktop_bg.png             <- PNG fallback
└── manifest.json              <- AssetPack manifest (для справки)
```

## Spine Assets

Spine ассеты располагаются в `assets/spine/{bundle}/{dir}/`. `generate-manifest.js` сканирует эту структуру автоматически.

**Alias формируется по имени файла**, а не по имени папки:
- Каждый `.json`/`.skel` файл → `{filename}Data`
- Каждый `.atlas` файл → `{filename}Atlas`

Это позволяет хранить **несколько скелетов с общим атласом** в одной папке:

```
assets/spine/main/symbols/
├── apple.json          → alias: appleData
├── banana.json         → alias: bananaData
├── grape.json          → alias: grapeData
├── effect.json         → alias: effectData
├── effect_symbols.atlas → alias: effect_symbolsAtlas
└── effect_symbols.png
```

Loose файлы прямо в bundle-директории тоже поддерживаются:

```
assets/spine/main/
├── transition.json     → alias: transitionData
├── transition.atlas    → alias: transitionAtlas
├── transition.png
└── background/         → подпапка, обрабатывается как обычно
    ├── background.json → alias: backgroundData
    └── background.atlas → alias: backgroundAtlas
```

**Важно:** имена файлов скелетов должны быть уникальны в пределах бандла, иначе alias-ы будут конфликтовать.

## resources-manifest.js

Спрайтшиты указываются с массивом src для выбора формата:

```js
{ alias: "main-sprites", src: ["./assets/img/main.webp.json", "./assets/img/main.png.json"] },
{ alias: "desktop_bg", src: ["./assets/img/desktop_bg.webp", "./assets/img/desktop_bg.png"] },
```

PIXI.Assets выбирает лучший формат (webp предпочтительнее).

Звуки выделены в отдельный бандл для будущей ленивой загрузки на мобильных.

## Теги AssetPack

| Тег | Назначение |
|-----|------------|
| `{tps}` | Texture Packer Spritesheet — пакует содержимое в атлас |
| `{m}` | Manifest bundle — создаёт отдельный бандл (пока не используется) |

## Команды

- `npm run pack` — ручной запуск паковки
- `npm run build` / `npm run build:prod` — паковка включена в билд автоматически
- `npm run dev` — паковка при старте + watcher для hot reload
- `npm run dev -- --watch-components` — + polling Figma API для hot reload компонентов
- `node bin/onearm-figma.js export-components --watch` — standalone watch для компонентов

## Добавление новых ассетов

1. Добавить PNG в нужную `{tps}` папку — spritesheet перегенерируется при билде
2. `resources-manifest.js` НЕ нужно менять (фреймы регистрируются автоматически)
3. `Sprite.from("NewAsset")` — работает сразу

## Добавление новых бандлов

Для будущих бандлов preload/, desktop/, mobile/:

1. Создать папку с тегами: `assets/img/preload{tps}/`, `assets/img/desktop{tps}/`
2. В Figma: переименовать ноду в `path/preload{tps}`, `path/desktop{tps}`
3. Добавить бандл в `resources-manifest.js`:
```js
{ name: "preloader", assets: [{ alias: "preload-sprites", src: ["./assets/img/preload.webp.json", "./assets/img/preload.png.json"] }] }
```
4. Загрузить во flow: `await resources.load("preloader")`
