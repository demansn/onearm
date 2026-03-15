# {{GAME_NAME}}

## Quick Start

```bash
npm install
npm run dev
```

## Assets

Все ассеты в `assets/` автоматически подхватываются при `npm run dev` / `npm run build`.
Файл `resources-manifest.js` генерируется автоматически — **не редактируй вручную**.

### Директории

| Директория | Что класть | Bundle | Alias |
|---|---|---|---|
| `fonts/` | `.ttf`, `.woff`, `.woff2` | `logo` | Имя файла без `-Regular` и т.д. |
| `sound/` | `.mp3` (+ `.ogg` рядом как fallback) | `sounds` | Имя файла без расширения |
| `spine/{bundle}/{alias}/` | `.json` + `.atlas` + `.png` | По имени 1-й папки | По имени 2-й папки |
| `spritesheet/{bundle}/` | `.json` + `.png` (готовый spritesheet) | По имени папки | Имя JSON без расширения |
| `img/{name}{tps}/` | `.png` спрайты для паковки | `main` | `{name}-sprites` |
| `img/*.png` | Отдельные картинки | `main` | Имя файла без расширения |

### Примеры

**Добавить звук:**
```
assets/sound/click.mp3
assets/sound/click.ogg    ← опционально, ogg fallback
```
Результат: alias `click` в bundle `sounds`.

**Добавить Spine-анимацию:**
```
assets/spine/preloader/hero/
  hero.json
  hero.atlas
  hero.png
```
Результат: alias `heroData` + `heroAtlas` в bundle `preloader`.

**Добавить готовый spritesheet:**
```
assets/spritesheet/main/
  UI_Elements.json
  UI_Elements.png
```
Результат: alias `UI_Elements` в bundle `main`. Текстуры фреймов доступны по именам из JSON.

**Добавить шрифт:**
```
assets/fonts/Roboto-Bold.ttf
```
Результат: alias `Roboto` в bundle `logo`, family `"Roboto"`.

**Паковка спрайтов (AssetPack):**
```
assets/img/main{tps}/
  button.png
  icon.png
  panel.png
```
Результат: автоматическая паковка в spritesheet `main-sprites` с WebP-сжатием. Текстуры доступны как `button`, `icon`, `panel`.

### Bundles (порядок загрузки)

1. **`logo`** — шрифты, config.json (загружается первым, до показа экрана)
2. **`preloader`** — ассеты для экрана загрузки (Spine-анимации, спрайтшиты прелоадера)
3. **`main`** — основные игровые ассеты (спрайты, фоны)
4. **`sounds`** — все звуки

Порядок загрузки определяется flow chain: `logo` → `preloader` → `main`.
Bundle name = имя поддиректории в `spine/`, `spritesheet/`.

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Dev server с hot reload |
| `npm run build` | Production build |
| `npm run build:prod` | Minified production build |
| `npm run fonts` | Export fonts from Figma |
| `npm run export` | Export images from Figma |
| `npm run export:components` | Export components from Figma |
| `npm run generate-spine` | Generate Spine manifest for Figma plugin |
| `npm run pack` | Pack images into spritesheets |
| `npm run convert-spine` | Convert Spine JSON to binary `.skel` |
