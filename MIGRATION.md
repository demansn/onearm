# Migration Guide: Engine v0.19 (Font Weight Detection, Bundle Routing)

## Overview

v0.19 уточняет два аспекта asset pipeline. Хард-breaking изменений нет, но возможны
визуальные/runtime отличия без изменений в коде игры.

### 1. Font weight/style auto-detection

Манифест шрифтов теперь парсит суффиксы файлов (`-Bold`, `-Italic`, `-Light` и т.д.)
через `FONT_WEIGHT_MAP` и регистрирует FontFace с правильными CSS-дескрипторами.

- **Было:** все вариации шрифта регистрировались как `weight: normal, style: normal`,
  `fontWeight: "bold"` рендерился как синтетический bold из Regular.
- **Стало:** `Halant-Bold.ttf` регистрируется с `weight: bold` — `fontWeight: "bold"` тянет
  реальный Bold-файл.

**Миграция:** ничего делать не нужно. Если стили в проекте полагались на синтетический
bold, проверьте, что финальный визуал устраивает; иначе удалите Bold-файл из `assets/fonts/`
или используйте `fontWeight: "normal"`.

### 2. `{tps}` bundle routing

Спрайтшиты из `assets/img/<name>{tps}/` теперь уходят в bundle с именем `<name>`,
если такой bundle существует, иначе fallback в `main` (старое поведение).

- **Было:** все `{tps}`-спрайтшиты складывались в `main` bundle.
- **Стало:** `preloader{tps}` → `preloader`, `ui{tps}` → `ui`, и т.д.; `<name>{tps}` без
  одноимённого bundle по-прежнему уходит в `main`.

**Миграция:** ничего делать не нужно для проектов, которые уже структурируют ассеты по
bundle-папкам (рекомендуемое разделение preloader/main/ui). Если проект ожидал, что
`preloader{tps}` окажется в `main`, переименуйте папку или ссылайтесь на новый bundle.

---

# Migration Guide: Engine v0.17 (Configurable Reels AnimationStrategy)

## Overview

v0.17 позволяет задавать `AnimationStrategy` и `strategyOptions` для `Reels` напрямую через `GameConfig.reelsConfig`, без написания кастомного LayoutBuilder.

## Конфигурация AnimationStrategy через GameConfig

**До (требовался кастомный LayoutBuilder):**
```js
LayoutBuilder.registerLayoutBuilder("Reels", function (config) {
    // ... кастомный builder
    const reels = new Reels({ ...reelsGeometry, reelsSymbols, AnimationStrategy: MyStrategy });
    return reels;
});
```

**После (через `GameConfig.reelsConfig`):**
```js
// GameConfig.js
import { MyAnimationStrategy } from "./MyAnimationStrategy.js";

export const GameConfig = {
    reelsConfig: {
        AnimationStrategy: MyAnimationStrategy,
        strategyOptions: {
            fallDuration: 0.4,
            ease: "power2.out",
        },
    },
};
```

Игры, использующие дефолтный `CascadeStrategy`, изменений не требуют — он остаётся fallback-значением.

---

# Migration Guide: Engine v0.13 (Declarative ReelsScene, ReelsConfig Export)

## Overview

v0.13 changes how reels are created and configured:
1. **ReelsScene** uses declarative `layouts.build("ReelsLayout")` instead of manual `createObject(Reels)`
2. **ReelsConfig** replaces ReelsLayout as the Figma component name for reel grid configuration
3. **Reels** simplified to a data container — spin/stop orchestration moved to ReelsScene

## 1. Figma: Rename ReelsLayout → ReelsConfig

The Figma component that defines the reel grid must be named **ReelsConfig** (exact match).

```
// Before: component named "ReelsLayout"
// After: component named "ReelsConfig"
```

Re-export after renaming: `npm run export:components`

## 2. ReelsScene: Declarative Build

**Before:**
```js
const config = this.layouts.getConfig("ReelsLayout");
const params = { ...config.reels, reelsSymbols: new ReelsSymbols(symbols) };
this.reels = this.createObject(Reels, { params, x: config.reels.x, y: config.reels.y });
```

**After:**
```js
const layout = this.layouts.build("ReelsLayout");
this.addChild(layout);
this.reels = this.find("reels");  // label matches Figma instance name
```

The `addSlotObjects.js` module registers a "Reels" layout builder that handles Reels creation automatically. Import it in your slots index:

```js
// modules/slots/index.js
import './addSlotObjects.js';
```

## 3. Spin/Stop Moved to ReelsScene

Methods `spin()`, `stop()`, `quickStop()` were removed from `Reels` class. ReelsScene now orchestrates reel animations directly:

```js
// Before (in ReelsScene)
tl.add(this.reels.spin(type));
tl.add(this.reels.stop(result.matrix));

// After (in ReelsScene) — access individual reels
for (let i = 0; i < this.reels.reels.length; i++) {
    const delay = instant ? 0 : 0.1 * i;
    spinTl.add(this.reels.reels[i].startSpin(type), delay);
}
```

Similarly, `playWinAnimationsByPositions()`, `setStickySymbols()`, `getMultiplierFlyAnimation()` moved from Reels to ReelsScene.

## 4. LayoutBuilder: Mask Auto-Discovery

`LayoutBuilder` now automatically finds children named `"mask"` and applies them as PIXI masks. No manual mask setup needed:

```js
// Before
if (config.mask) {
    this.reels.mask = this.buildLayout(config.mask);
    this.reels.mask.visible = true;
}

// After — handled automatically by LayoutBuilder
// Just ensure Figma has a child named "mask" in the layout
```

## Quick Migration Checklist

1. Rename Figma component `ReelsLayout` → `ReelsConfig`
2. Re-export: `npm run export:components`
3. Add `import './addSlotObjects.js'` to slots index
4. Update ReelsScene to use `layouts.build("ReelsLayout")` + `this.find("reels")`
5. Move any custom spin/stop logic from Reels subclass to ReelsScene
6. Remove manual mask setup — LayoutBuilder handles it
7. Verify: `npm run dev -- -game=sandbox`

---

# Migration Guide: Engine v0.12 (Animation Clips, Declarative Symbols, Layout Modes)

## Overview

v0.12 introduces three significant changes:
1. **Animation Clips** — animations extracted from acts into reusable clip functions with a registry
2. **Declarative ReelSymbol children** — symbol visuals via `children` array instead of hardcoded `bg`/`frame`/`sprite`/`drop`
3. **Layout modes vs variants** — explicit separation of viewport layouts (`modes`) from component states (`variants`)

## 1. Animation Clips System

### What changed

Inline GSAP animations in acts (PaysAct, CascadeAct, etc.) are now extracted into **clip functions** — pure functions `(target, options?) → gsap.Timeline`. Clips live in `modules/slots/animations/clips/`, registered in `AnimationRegistry` service, and overridable per-game via `GameConfig.animations`.

### Migration

**Acts — use registry instead of inline animations:**

```js
// Before: inline animation in act
makePaysAnimation() {
    const timeline = gsap.timeline();
    this.result.pays.forEach(pay => {
        // 30+ lines of inline animation code
    });
    return timeline;
}

// After: get clip from registry
constructor(params) {
    this.anim = getEngineContext().services.get("animations");
}

makePaysAnimation() {
    const timeline = gsap.timeline();
    this.result.pays.forEach(pay => {
        timeline.add(this.anim.get("payPresentation")(pay, {
            reels: this.reels, hud: this.hud, counterTarget: this, isTurbo: this.isTurboSpin,
        }));
    });
    return timeline;
}
```

**GameConfig — override default clips:**

```js
// GameConfig.js
import { customSymbolWin } from "./animations/customSymbolWin.js";

export const GameConfig = {
    animations: {
        symbolWin: customSymbolWin,  // overrides engine default
    },
};
```

**Built-in clips:** `symbolWin`, `symbolDestroy`, `symbolDrop`, `symbolTrigger`, `multiplierFly`, `winCounter`, `payPresentation`, `multiplierPresentation`, `cascade`, `plinkoBall`.

**Composition helpers:** `sequence(items)`, `parallel(items)`, `stagger(items, factory, time)` from `onearm`.

See `docs/animation-clips.md` for full reference.

## 2. Declarative ReelSymbol Children

### What changed

Symbol configs no longer use hardcoded `bg`, `frame`, `drop`, `sprite` fields. Instead, all visual children are declared in a `children` array and created via ObjectFactory.

### Migration

**Update symbol configs:**

```js
// Before
{ name: "S1", id: 10,
  bg: "bg_texture",
  frame: "frame_texture",
  drop: { spine: "gool_hv_1", atlas: "gool_atlas" },
  zIndex: 100 }

// After
{ name: "S1", id: 10,
  children: [
    { type: "spine", label: "body", spine: "gool_hv_1", animation: "gool_hv_1", scale: { x: 0.15, y: 0.15 } },
    { type: "frame_texture", label: "frame", anchor: [0.5, 0.5] },
    { type: "bg_texture", label: "bg", anchor: [0.5, 0.5] },
  ],
  zIndex: 100 }
```

**Key conventions:**
- `label: "body"` — main spine, accessible via `symbol.spine` getter (alias for `symbol.find("body")`)
- `type` — texture name, `"spine"` for SpineTimeline, `"EngineText"` for auto-scale text
- Display properties (`scale`, `anchor`, `x`, `y`) are flat in the child object

**Animation clips access:**

```js
const body = symbol.spine;         // find("body")
const frame = symbol.find("frame");
body.animation;                    // public field from SpineTimeline
body.timeline({ animation: body.animation, timeScale });
```

See `docs/reel-symbol-children.md` for full reference.

## 3. Layout Modes vs Variants Separation

### What changed

Previously, both viewport layouts (portrait/landscape/desktop) and component states used the `variants` field in `components.config.json`. Now they are explicitly separated:
- **`modes`** — viewport layouts, only for Scenes. Managed by `ScreenLayout`.
- **`variants`** — component visual states (size, state, etc.). Resolved by `LayoutBuilder`.

### Migration

**Figma naming:** Scene components must end with `Scene` suffix (e.g., `HUDScene`, `BoardScene`). This sets `isScene: true` in componentRegistry.

**Export format changes:**

```json
// Before: Scene used "variants" for viewport layouts
{ "name": "HUDScene", "type": "ScreenLayout",
  "variants": { "default": {...}, "portrait": {...} } }

// After: Scene uses "modes"
{ "name": "HUDScene", "type": "Scene",
  "modes": { "default": {...}, "portrait": {...} } }

// Components still use "variants" for states
{ "name": "BetSelector", "type": "RadioGroup",
  "variants": { "3items": {...}, "5items": {...} } }
```

**Code changes:**
- `LayoutBuilder.build()` — no changes needed, automatically detects `modes` field
- If calling `buildScreenLayout()` manually — pass `modes` instead of `variants`
- Re-export components: `npm run export:components`

---

# Migration Guide: Engine v0.9 (Asset Pipeline)

## Overview

v0.9 adds `@assetpack/core` for spritesheet packing and WebP compression. Games need to update their asset folder structure and `resources-manifest.js`.

## Asset folder structure

Rename image folders to include `{tps}` tag for spritesheet packing:

```
assets/img/main/        →  assets/img/main{tps}/
```

Large images (backgrounds) that shouldn't be packed into atlas — move out of `{tps}` folders:

```
assets/img/main/desktop_bg.png  →  assets/img/desktop_bg.png
```

## Remove meta.json

Delete `assets/img/meta.json` — it's no longer used. AssetPack handles alias registration automatically through spritesheets.

## Update resources-manifest.js

Replace individual image imports with spritesheet references:

```js
// Before
import mainAssets from "../../assets/img/meta.json";
// ...
{ name: "main", assets: [...mainAssets, { alias: "bgm", src: "..." }] }

// After (no imports needed)
{ name: "main", assets: [
    { alias: "main-sprites", src: ["./assets/img/main.webp.json", "./assets/img/main.png.json"] },
    { alias: "desktop_bg", src: ["./assets/img/desktop_bg.webp", "./assets/img/desktop_bg.png"] },
] },
{ name: "sounds", assets: [
    { alias: "button_click", src: "./assets/sound/click_button.mp3" },
    // ...
] },
```

Key changes:
- `src` is now an array `[webp, png]` — PIXI picks the best format
- Sounds moved to a separate `"sounds"` bundle (enables future lazy loading)
- No `meta.json` import

## Update preloader flow

Load sounds as a separate bundle:

```js
await resources.load("main", {
    onProgress(p) { scene.setProgress(p * 50); },
});
await resources.load("sounds", {
    onProgress(p) { scene.setProgress(50 + p * 50); },
});
```

## Figma node naming

Rename image page nodes to include `{tps}` tag:

```
path/main  →  path/main{tps}
```

The Figma export tool (`onearm-figma export-images`) takes folder names as-is, so the tag flows through automatically.

## No code changes needed

`Sprite.from("BallA")` and all texture references continue to work — PIXI.Assets automatically registers spritesheet frame names as texture aliases.

---

# Migration Guide: Engine v0.5 (Architecture Refactoring)

## Overview

Engine v0.5 restructures `modules/engine/common/` for simplicity and consistency:

- **7 deprecated classes removed**, replaced by 5 unified classes
- **God-object pattern eliminated** (SuperContainer static fields → EngineContext)
- **3 buttons → 1**, **4 layout containers → 1**, **3 sliders → 1**

### New structure

```
common/
├── core/
│   ├── EngineContext.js    # Global engine state (replaces SuperContainer statics)
│   ├── BaseContainer.js    # Base class for all display objects (replaces SuperContainer)
│   └── ObjectFactory.js    # Object creation registry (replaces Mather)
├── layout/
│   └── Layout.js           # Unified layout container (replaces AutoLayout + FlexContainer)
├── unified/
│   ├── Button.js           # Unified button (replaces Button + AnimationButton)
│   └── Slider.js           # Unified slider (replaces CustomSlider + ValueSlider)
├── displayObjects/         # (unchanged)
└── UI/                     # (unchanged, uses BaseContainer internally)
```

---

## Breaking Changes

### 1. SuperContainer → BaseContainer

**Before:**
```js
import { SuperContainer } from "engine/common/displayObjects/SuperContainer.js";

class MyComponent extends SuperContainer {
    constructor() {
        super();
        // Access via static fields:
        SuperContainer.textures;
        SuperContainer.styles;
        SuperContainer.layers;
    }
}
```

**After:**
```js
import { BaseContainer } from "engine/common/core/BaseContainer.js";
// or
import { BaseContainer } from "engine/index.js";

class MyComponent extends BaseContainer {
    constructor() {
        super();
        // Static fields removed. Use services or EngineContext if needed:
        // import { getEngineContext } from "engine/common/core/EngineContext.js";
        // const ctx = getEngineContext();
    }
}
```

API is identical — `find()`, `get()`, `findAll()`, `forAll()`, `createObject()`, `addObject()`, `step()`, `onScreenResize()`, `destroy()`, `setTint()`, `restoreTint()`, `components` all work the same.

The `mather` getter still works as backward-compat alias for `factory`.

### 2. Mather → ObjectFactory

**Before:**
```js
import { Mather } from "engine/common/displayObjects/Mather.js";

Mather.registerObjectFactory("MyWidget", (opts) => new MyWidget(opts));
Mather.registerObjectConstructor("MyClass", MyClass);
```

**After:**
```js
import { ObjectFactory } from "engine/common/core/ObjectFactory.js";
// or
import { ObjectFactory } from "engine/index.js";

ObjectFactory.registerObjectFactory("MyWidget", (opts) => new MyWidget(opts));
ObjectFactory.registerObjectConstructor("MyClass", MyClass);
```

API is identical — only the class name and import path changed.

### 3. AutoLayout → Layout (mode: "auto")

**Before:**
```js
import { AutoLayout } from "engine/common/displayObjects/AutoLayout.js";

class MyPanel extends AutoLayout {
    constructor() {
        super({
            flow: "horizontal",
            gap: 10,
            contentAlign: { x: "center", y: "center" },
        });
    }
}
```

**After:**
```js
import { Layout } from "engine/common/layout/Layout.js";
// or
import { Layout } from "engine/index.js";

class MyPanel extends Layout {
    constructor() {
        super({
            mode: "auto",  // default, can be omitted
            flow: "horizontal",
            gap: 10,
            contentAlign: { x: "center", y: "center" },
        });
    }
}
```

`mode: "auto"` is the default, so you can omit it. All AutoLayout options (`flow`, `gap`, `wrap`, `contentAlign`, `spaceBetween`, `areaAlign`) work identically.

### 4. FlexContainer → Layout (mode: "manual")

**Before:**
```js
import { FlexContainer } from "engine/common/displayObjects/FlexContainer.js";

class MyScreen extends FlexContainer {
    constructor() {
        super({ size: { width: 800, height: 600 } });
    }
}
```

**After:**
```js
import { Layout } from "engine/common/layout/Layout.js";
// or
import { Layout } from "engine/index.js";

class MyScreen extends Layout {
    constructor() {
        super({
            mode: "manual",
            size: { width: 800, height: 600 },
        });
    }
}
```

All FlexContainer options (`size`, `areaAlign`, child `display` property with `align`/`offset`) work identically.

### 5. ComponentContainer → BaseContainer

Direct replacement, no changes needed:

```js
// Before
import { ComponentContainer } from "engine/common/displayObjects/ComponentContainer.js";
// After
import { BaseContainer } from "engine/common/core/BaseContainer.js";
```

### 6. AnimationButton → Button

**Before:**
```js
import { AnimationButton } from "engine/common/UI/AnimationButton.js";

new AnimationButton({ image: "btn_spin" });
```

**After:**
```js
import { Button } from "engine/common/unified/Button.js";
// or
import { Button } from "engine/index.js";

new Button({
    image: "btn_spin",
    animation: { hover: 1.03, press: 0.95 },
    sounds: { press: "button_click", hover: "button_hover" },
});
```

The unified Button supports 4 modes:
- **name**: `new Button({ name: "spin" })` — looks up `spin_btn_default/hover/pressed/disabled` textures
- **template**: `new Button({ template: "btn_[state]_bg" })` — pattern-based texture names
- **image**: `new Button({ image: "btn_spin", animation: {...} })` — single texture with scale animation
- **views**: `new Button({ views: { defaultView, hoverView, ... } })` — explicit FancyButton views

Additional options: `text`, `textStyle`, `sounds`, `disabledStyle`, `onClick`, `disabled`.

### 7. ValueSlider → Slider

**Before:**
```js
import { ValueSlider } from "engine/common/UI/ValueSlider.js";

const slider = new ValueSlider();
slider.init({ steps: [0.5, 1, 2, 5, 10] });
```

**After:**
```js
import { Slider } from "engine/common/unified/Slider.js";
// or
import { Slider } from "engine/index.js";

const slider = new Slider();
slider.init({ steps: [0.5, 1, 2, 5, 10] });
```

The unified Slider supports two modes:
- **Direct**: pass `bg`, `fill`, `slider` objects in constructor
- **Layout**: call `init()` after children are added (finds `SliderBG`, `SliderFill`, `SliderBtn` by name)

Signals: `onUpdate` (during drag), `onChange` (on release).

### 8. Old Button (UI/Button.js) → unified Button

The old `Button` from `common/UI/Button.js` (extending FancyButton directly) is no longer exported from `engine/index.js`. Use the unified Button instead.

**Before:**
```js
import { Button } from "engine/index.js"; // was old FancyButton wrapper

new Button({ name: "spin", onClick: () => {} });
```

**After:**
```js
import { Button } from "engine/index.js"; // now unified Button

new Button({ name: "spin", onClick: () => {} });
```

The constructor API is compatible — `name`, `template`, `onClick` all work the same.

---

## Layout Config Compatibility

String type names used in layout JSON configs continue to work:

| Layout config type      | Creates                                      |
|------------------------|----------------------------------------------|
| `"AutoLayout"`         | `Layout` with `mode: "auto"`                 |
| `"FlexContainer"`      | `Layout` with `mode: "manual"`               |
| `"ComponentContainer"` | `BaseContainer`                               |
| `"AnimationButton"`    | `Button` with default animation and sounds   |
| `"SuperContainer"`     | `BaseContainer` (with resize context)         |

No changes needed in layout JSON files.

---

## Deleted Files

| Removed file                                     | Replacement                        |
|-------------------------------------------------|-------------------------------------|
| `common/displayObjects/SuperContainer.js`        | `common/core/BaseContainer.js`      |
| `common/displayObjects/Mather.js`                | `common/core/ObjectFactory.js`      |
| `common/displayObjects/AutoLayout.js`            | `common/layout/Layout.js`           |
| `common/displayObjects/FlexContainer.js`         | `common/layout/Layout.js`           |
| `common/displayObjects/ComponentContainer.js`    | `common/core/BaseContainer.js`      |
| `common/UI/AnimationButton.js`                   | `common/unified/Button.js`          |
| `common/UI/ValueSlider.js`                       | `common/unified/Slider.js`          |
| `common/displayObjects/SpineComponent.js`        | (was empty, deleted)                |

---

## Quick Migration Checklist

1. Find & replace imports:
   - `SuperContainer` → `BaseContainer` (from `core/BaseContainer.js`)
   - `Mather` → `ObjectFactory` (from `core/ObjectFactory.js`)
   - `AutoLayout` → `Layout` (from `layout/Layout.js`)
   - `FlexContainer` → `Layout` (from `layout/Layout.js`, add `mode: "manual"`)
   - `ComponentContainer` → `BaseContainer`
   - `AnimationButton` → `Button` (from `unified/Button.js`, add `animation` + `sounds`)
   - `ValueSlider` → `Slider` (from `unified/Slider.js`)

2. For `FlexContainer` subclasses: add `mode: "manual"` to constructor options

3. For `AnimationButton` usages: add `animation: { hover: 1.03, press: 0.95 }` and `sounds: { press: "button_click", hover: "button_hover" }` to options

4. Remove any references to `SuperContainer.textures`, `SuperContainer.styles`, etc. — use `getEngineContext()` or services instead

5. Verify build: `npm run dev -- -game=sandbox`
