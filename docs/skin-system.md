# Skin System

Overlay-based visual theming. The base game lives in `assets/`; extra skins go in `skins/<name>/`.

## Directory contract

```
<game>/
├── assets/          ← base / default skin (every game already has this)
└── skins/           ← OPTIONAL, only games that need themes
    ├── halloween/
    │   └── img/main{tps}/L1.png   ← overrides assets/img/main{tps}/L1.png
    └── neon/
        └── spine/main/BG.json + .atlas + .png
```

**Rules:**
- `assets/` is always the default skin (name `"default"`).
- `skins/default/` is **forbidden** — the build will throw.
- Every file in `skins/<name>/` must have a matching file in `assets/` at the same relative path. Unknown paths (typos) are caught at build time (orphan check).
- File names and relative paths must match exactly between overlay and base.

## How it activates

Skin mode is **additive** — it activates automatically when a `skins/` directory exists in the game root. No flags in `GameConfig` needed.

- **Classic path** (no `skins/`): identical build and runtime to before.
- **Skin mode** (`skins/` present): `npm run build` packs `default` + each overlay into `dist/skins/<name>/`, injects `window.__SKINS__` into `dist/index.html`.

## Build output

```
dist/
├── Main.js                       ← JS bundle
├── main.css
├── index.html                    ← contains window.__SKINS__ and boot splash
└── skins/
    ├── default/
    │   ├── assets/               ← spritesheets, sounds, spine, fonts
    │   └── manifest.json         ← { bundles: [...] } with /skins/default/... paths
    └── halloween/
        ├── assets/
        └── manifest.json
```

## Runtime

`Game.init()` checks for `window.__SKINS__` (injected at build). If present:
1. Reads `?s=<skin>` (or `?skin=<skin>`) from URL.
2. Validates against `window.__SKINS__` list. Unknown skins fall back to `default`.
3. Fetches `/skins/<resolved>/manifest.json`.
4. Merges into `gameConfig.resources.manifest` before services start.
5. Hides boot splash.

Non-skin games never define `window.__SKINS__` and never enter this code path.

## Manual skin pack (escape hatch)

```bash
npx onearm-skin pack default     # repack default skin only
npx onearm-skin pack halloween   # repack halloween overlay
```

## Boot splash

Two-tier precedence:
1. `<gameRoot>/static/boot-splash.html` — game-level override.
2. `<engineRoot>/static/boot-splash.html` — engine default.

Per-skin CSS via `data-skin` attribute (set by the splash script to `?s=` value):

```html
<!-- In your game's static/boot-splash.html: -->
<style>
  #boot-splash[data-skin="halloween"] { --bs-bg: orange; }
</style>
```

## Watch mode (dev server)

`npm run dev` detects `skins/` and switches to skin-watch mode automatically:
- Changes in `assets/**` → repack `default` skin + page reload.
- Changes in `skins/<X>/**` → repack `<X>` skin + page reload.

## Migration from `assets/<skin>/` layout

If your game currently keeps skins inside `assets/` (e.g. `assets/halloween/`):

```bash
git mv assets/halloween skins/halloween
# Remove old pack-skin / build-all scripts — the engine handles them now
```

Update `package.json` scripts:
```json
"build":     "GAME_ROOT=$PWD npm run build --prefix node_modules/onearm",
"build:prod": "GAME_ROOT=$PWD npm run build:prod --prefix node_modules/onearm",
"pack:skin": "npx onearm-skin pack"
```
