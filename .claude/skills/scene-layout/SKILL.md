---
name: scene-layout
description: |
  Skill for creating scenes, building layouts, and responsive UI on the onearm engine.
  Use this skill whenever the user wants to: create a new scene, build a layout,
  configure responsive positioning, set up multi-variant layouts (portrait/landscape/desktop),
  use zone-based positioning, create UI containers, work with ScreenLayout,
  configure components.config, use ObjectFactory, or understand the display object hierarchy.
  Trigger on any mention of: scene, layout, ScreenLayout, Layout, displayConfig, zone,
  responsive, portrait, landscape, variant, container, ZoneContainer, LayoutBuilder,
  LayoutSystem, buildLayout, components config, ObjectFactory, BaseContainer, find, forAll,
  UI positioning, anchor, pivot, gap, flow, wrap, contentAlign, spaceBetween, manual layout,
  auto layout, display object, component builder, screen resize, safe area, game zone.
---

# Scene & Layout Development on onearm Engine

You are building scenes and layouts for a slot game using the onearm engine (PIXI.js 8, GSAP, ES Modules).

For detailed API reference, read `references/layout-api.md`.

## Architecture Overview

Three layers work together:

```
Layout (Container)          — Positions children (auto-flow or manual)
LayoutSystem (Service)      — Zone-based responsive positioning via displayConfig
LayoutBuilder (Service)     — Builds display trees from components.config
ScreenLayout                — Manages multiple layout variants (portrait/landscape/desktop)
```

## Creating a Scene

Scenes extend `Scene` (which extends `BaseContainer`). Registered in GameConfig:

```js
import { Scene } from "onearm";

export class HUDScene extends Scene {
    create(options) {
        // Layout auto-built if components.config has entry matching scene name
        // Access via this.layout

        // Or build manually:
        const btn = this.createObject("Sprite", { texture: "btn_spin", x: 100, y: 200 });
        this.addChild(btn);
    }
}

// Register in GameConfig:
export const GameConfig = {
    scenes: { HUDScene, ReelsScene, PreloaderScene },
    // ...
};
```

Scene lifecycle in flows:
```js
async function main(scope, ctx) {
    const hud = ctx.scenes.show("HUDScene");
    scope.defer(() => ctx.scenes.remove("HUDScene"));
    // ...
}
```

SceneManager API:
- `ctx.scenes.show(name, options)` — create and show (calls `create(options)`)
- `ctx.scenes.hide(name)` — hide without destroying
- `ctx.scenes.remove(name)` — destroy and unregister
- `ctx.scenes.get(name)` — get scene instance

## Layout Modes

### Auto Layout (flow-based)
Children positioned sequentially in a row or column:

```js
import { Layout } from "onearm";

const toolbar = new Layout({
    mode: "auto",
    flow: "horizontal",     // or "vertical"
    gap: { x: 10 },
    contentAlign: { x: "center", y: "center" },
    size: { width: 800, height: 100 },
});
toolbar.addChild(btn1, btn2, btn3);  // auto-positioned left to right
```

Options: `flow`, `gap`, `wrap`, `contentAlign`, `spaceBetween`, `areaAlign`.

### Manual Layout (individual positioning)
Each child positioned via its `display` property:

```js
const panel = new Layout({
    mode: "manual",
    size: { width: 1920, height: 1080 },
});

const logo = new Sprite(texture);
logo.display = {
    align: { x: "center", y: "top" },
    offset: { top: 50 },
};
panel.addChild(logo);

const closeBtn = new Button({ name: "close" });
closeBtn.display = {
    align: { x: "right", y: "top" },
    offset: { right: 20, top: 20 },
};
panel.addChild(closeBtn);
```

Align values: `"left"`, `"center"`, `"right"`, `"top"`, `"bottom"`, or `"50%"`.

## Zone-Based Positioning (displayConfig)

LayoutSystem automatically positions objects with `displayConfig`:

```js
const button = this.createObject("Sprite", {
    texture: "btn_spin",
    displayConfig: {
        x: "50%",              // 50% of zone width
        y: "90%",              // 90% of zone height
        zone: "game",          // basis zone: "fullScreen", "save", "game", "parent"
        anchor: [0.5, 0.5],
    },
});
```

Values: numbers (pixels), `"50%"` (percentage of zone), `"100px"` (pixels).

Zones:
- `"fullScreen"` — entire browser viewport
- `"save"` — safe area (avoids notches/bezels)
- `"game"` — game stage area (design resolution)
- `"parent"` — parent container bounds

## Multi-Variant Layouts (ScreenLayout)

For responsive designs with different layouts per orientation:

```js
// ScreenLayout is created automatically by Scene.buildLayout()
// when config has multiple variants

// In components.config.json:
{
    "name": "HUDLayout",
    "variants": {
        "default": { "children": [/* desktop layout */] },
        "portrait": { "children": [/* portrait layout */] },
        "landscape": { "children": [/* landscape layout */] }
    }
}

// ScreenLayout API:
this.layout.get("buttonName");           // search in current variant
this.layout.findAll("button_*");         // search all variants
this.layout.forAll("button_*", b => b.enabled = false);  // apply to all
this.layout.mode;                        // current mode
this.layout.onLayoutChange.connect(() => { /* variant switched */ });
```

## Components Config Format

File: `games/<game>/assets/components.config.json`

```json
{
    "components": [
        {
            "name": "HUDLayout",
            "type": "ComponentContainer",
            "children": [
                {
                    "name": "spinButton",
                    "type": "AnimationButton",
                    "x": 960, "y": 900,
                    "properties": { "name": "spin" }
                },
                {
                    "name": "balanceText",
                    "type": "Text",
                    "text": "0.00",
                    "style": "BalanceLabel",
                    "x": 200, "y": 50
                }
            ]
        }
    ]
}
```

Supported types: `ComponentContainer`, `AnimationButton`, `CheckBoxComponent`, `ValueSlider`, `DotsGroup`, `ProgressBar`, `ScrollBox`, `VariantsContainer`, `ZoneContainer`, `FullScreenZone`, `SaveZone`.

Use `"isInstance": true` to reference another named component from the config.

## Finding Objects in Scene Tree

Dot-notation queries work on any BaseContainer:

```js
scene.find("Panel.CloseButton");     // nested search
scene.get("SpinButton");             // same as find
scene.findAll("symbol_*");           // all matching (no wildcards — exact name per level)
scene.forAll("Button", btn => btn.enabled = false);
```

## Object Factory

Register custom display objects:

```js
import { ObjectFactory } from "onearm";

ObjectFactory.registerObjectConstructor("WinCounter", WinCounterClass);
// Then use anywhere:
const counter = container.createObject("WinCounter", { x: 100, y: 50 });

// Or pass class directly:
const counter = container.createObject(WinCounterClass, { x: 100, y: 50 });
```

Fallback chain: registered factory -> Sprite (if texture exists) -> Text.

## Scene with Layers

Scenes can be assigned to render layers for depth control:

```js
export class OverlayScene extends Scene {
    constructor() {
        super({ name: "OverlayScene", layer: "ui" });
    }
}

// Layers defined in GameConfig:
layers: { layers: ["background", "main", "reels", "ui", "overlay"] }
```

## Resize Handling

Override `onScreenResize` for custom resize logic:

```js
export class MyScene extends Scene {
    onScreenResize(event) {
        super.onScreenResize(event);
        // event.mode: "portrait" | "landscape" | "desktop"
        // event.zone.game: { width, height, left, top, center }
        // event.zone.save: { width, height, left, top, center }
        // event.zone.fullScreen: { width, height, left, top, center }

        if (event.mode === "portrait") {
            this.rearrangeForPortrait();
        }
    }
}
```

## Common Patterns

### Scene with auto-built layout + custom logic
```js
export class HUDScene extends Scene {
    create() {
        // this.layout already built from components.config
        const spinBtn = this.layout.find("spinButton");
        spinBtn.onPress.connect(() => this.onSpin());
    }
}
```

### Programmatic layout without config
```js
export class WinScene extends Scene {
    create({ winAmount }) {
        const panel = new Layout({ mode: "auto", flow: "vertical", gap: { y: 20 } });
        panel.addChild(
            this.createObject("Text", { text: "YOU WIN!", style: "WinTitle" }),
            this.createObject("Text", { text: `${winAmount}`, style: "WinAmount" }),
        );
        panel.displayConfig = { x: "50%", y: "50%", zone: "game", anchor: [0.5, 0.5] };
        this.addChild(panel);
    }
}
```

### ZoneContainer for full-screen overlay
```js
// In components.config:
{
    "name": "OverlayBg",
    "type": "FullScreenZone",
    "children": [
        { "name": "dimmer", "type": "Sprite", "texture": "black_pixel", "alpha": 0.7 }
    ]
}
```

### Button from layout with press signal shortcut
```js
const onPress = scene.getPressSignal("Panel.PlayButton");
await scope.wait(onPress);
```
