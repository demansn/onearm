# Spine Previewer

Built-in dev tool for previewing Spine animations from a game's asset bundle. Loads all spine assets declared in the game's `resources-manifest.js` and provides interactive controls for inspecting skeletons, animations, skins, and debug overlays.

---

## How to run

```bash
# Via dedicated script
npm run spine-preview -- -game=<name>

# Via dev command with flag
npm run dev -- --spine-preview -game=<name>
```

The `--spine-preview` flag overrides the esbuild entry point to `modules/engine/tools/spine-preview/Main.js` instead of the game's `Main.js`. The game's manifest is still used to discover and load spine assets, so all assets from `assets/spine/` are available.

The dev server starts normally (default port 9000, hot reload on file changes).

---

## UI Controls

A side panel (280px wide, left side) contains all controls:

| Control | Description |
|---|---|
| **Skeleton** | Dropdown to select which skeleton to display. Auto-loads the first one on start. |
| **Animation** | Dropdown populated with all animations from the selected skeleton. Plays the first animation automatically. |
| **Skin** | Dropdown with all skins. The first skin is applied on load so attachments are visible. |
| **Loop** | Checkbox (on by default). Toggles animation looping. |
| **Speed** | Slider from 0.1x to 3.0x (step 0.1). Controls `state.timeScale` on the Spine instance. |

The skeleton is auto-fitted to 80% of the available viewport area (excluding the panel).

An info label at the bottom shows animation count, skin count, and current animation duration.

---

## Debug Mode

Uses `SpineDebugRenderer` from `@esotericsoftware/spine-pixi-v8`. A master **Debug** checkbox enables/disables the debug overlay. When first enabled, **Bones** and **Slots** are turned on by default.

Sub-options (each is a checkbox):

| Checkbox | SpineDebugRenderer property |
|---|---|
| Bones | `drawBones` |
| Slots | `drawRegionAttachments` |
| Mesh | `drawMeshTriangles` + `drawMeshHull` |
| Bounding Boxes | `drawBoundingBoxes` |
| Paths | `drawPaths` |
| Clipping | `drawClipping` |
| Events | `drawEvents` |

Checking any sub-option when the master toggle is off will auto-enable the master toggle.

---

## Spine Version Compatibility

The previewer checks `skeleton.data.version` after loading. If the version does not start with `4.`, a warning is displayed:

> Spine 3.x -- incompatible (need 4.x)

Only Spine 4.x skeletons are compatible with `@esotericsoftware/spine-pixi-v8`. Spine 3.x assets must be re-exported from Spine Editor 4.x before they can be previewed.

---

## Architecture

```
modules/engine/tools/spine-preview/
  Main.js              -- Entry point, starts Game with spinePreviewFlow
  spinePreviewFlow.js  -- Flow function: UI, asset loading, interaction logic
```

- **Entry point** (`Main.js`) calls `Game.start()` with a minimal config: no scenes, no game-specific services, just the manifest and the preview flow.
- **Asset discovery** -- `findSpineAssets(manifest)` scans all bundles for aliases ending with `Data` (convention from `generate-manifest.js`). Matching bundles are loaded via `resources.load()`.
- **Skeleton instantiation** -- `Spine.from({ skeleton: "<name>Data", atlas: "<name>Atlas" })` using the standard alias naming convention.
- **UI** -- built with `@pixi/ui` components (`Select`, `CheckBox`, `Slider`) rendered directly in PixiJS. No HTML/DOM UI.

---

## See also

- **Spine → Figma pipeline** — команда `generate-spine` генерирует манифест с per-animation размерами, а Figma-плагин (`tools/figma/plugin/`) создаёт Spine-компоненты на основе этого манифеста. Подробнее: раздел "Spine Manifest для Figma" в `docs/asset-pipeline.md`.
