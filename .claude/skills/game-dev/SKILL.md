---
name: game-dev
description: |
  Skill for developing slot games on the onearm engine. Use this skill whenever the user wants to:
  create a new slot game, add game features, set up reels, configure symbols, create game states,
  build presentation acts (win animations), configure game math/logic, build UI/HUD layouts,
  set up autoplay, bets, free spins, cascades, or any other slot game mechanic.
  Also use when the user asks about the engine architecture, how flows/acts/reels work,
  or wants to modify existing game code. Trigger on any mention of: game, slot, reel, symbol,
  spin, win, act, HUD, bet, autoplay, free spins, cascade, payout.
  For detailed scene/layout work, defer to the scene-layout skill.
---

# Slot Game Development on onearm Engine

You are developing slot games using the onearm engine — a PIXI.js 8 based 2D engine with GSAP animations, Spine support, and a specialized slots module.

## Quick Architecture Reference

```
onearm/
├── modules/engine/     # Core: Game.js, ServiceLocator, services, display objects, UI
├── modules/slots/      # Slots: reels, acts, GameLogic, GameMath, states
└── games/
    ├── template/       # Minimal starter (copy this for new games)
    └── <game-name>/    # Each game is a separate project
```

**Tech stack**: PIXI.js 8.7, GSAP 3.13, Spine (@esotericsoftware/spine-pixi-v8), ESBuild, typed-signals, ES Modules.

**Run a game**: `npm run dev -- -game=<name>` from the repo root.

## Core Concepts

### 1. Game Initialization

Games start with `Game.start(GameConfig)`. The config defines:

```js
import { ServicesConfig } from "onearm";

export const GameConfig = {
    services: ServicesConfig,     // engine services (always use default)
    flow: firstFlow,              // entry point — async function
    resources: { manifest },      // PIXI asset bundles
    layers: { layers: ["background", "main", "ui"] },
    scenes: { PreloaderScene, HUDScene, ReelsScene },
    styles: {},
};
```

### 2. Flow System (preferred over FSM)

Flows are async functions `(scope, ctx) => Promise`. They chain by returning the next flow:

```js
async function preloader(scope, ctx) {
    const scene = ctx.scenes.show("PreloaderScene");
    scope.defer(() => ctx.scenes.remove("PreloaderScene"));
    await ctx.resources.load("main", { onProgress(p) { scene.setProgress(p * 100); } });
    return main;  // transitions to main flow
}
```

**scope** provides:
- `scope.defer(fn)` — cleanup when flow exits (LIFO order)
- `scope.on(signal, handler)` — auto-disconnecting signal listener
- `scope.wait(signal)` — one-shot signal await
- `scope.run(fn, ...args)` — child scope (disposed after fn returns)

### 3. Services

Accessed via global `services` singleton:
- `services.get("scenes")` / `services.scenes` — scene management
- `services.get("audio")` / `services.audio` — sound (SFX, music, ambient)
- `services.get("resources")` — asset loading
- `services.get("data")` — shared data model
- `services.get("resizeSystem")` — responsive layout
- `services.get("layers")` — PIXI RenderLayer instances
- `services.get("gameLogic")` — API calls, balance, bets (slots module)

### 4. Display Objects

All game objects extend `BaseContainer` (PIXI Container with engine context):

```js
const obj = new BaseContainer();
obj.createObject("Sprite", { texture: "myTexture", x: 100, y: 200 });
obj.createObject(MyCustomClass, { ... });
obj.find("childName");          // dot notation: "parent.child"
obj.findAll("name");
```

**ObjectFactory** — register custom classes:
```js
ObjectFactory.registerObjectConstructor("MyWidget", MyWidgetClass);
// then use: container.createObject("MyWidget", { ... });
```

### 5. Scenes

Extend `Scene` from the engine. Shown/removed via `SceneManager`:

```js
import { Scene } from "onearm";

export class MyScene extends Scene {
    create() { /* build display tree here */ }
}

// Usage in flow:
ctx.scenes.show("MyScene");
scope.defer(() => ctx.scenes.remove("MyScene"));
```

## Slots Module

For detailed reference on slots-specific systems, read:
- `references/reels-system.md` — Reels, Reel, ReelSymbol, strategies, ReelsMatrix
- `references/acts-system.md` — PresentationAct, AsyncActionsScenario, built-in acts
- `references/game-logic.md` — GameLogic, GameMath, BetsController, AutoplayController

### Reels Configuration

Reels are configured with a symbols array and grid dimensions:

```js
const reelsConfig = {
    rows: 3,
    columns: 5,
    symbolWidth: 200,
    symbolHeight: 200,
    symbols: [
        { id: 0, name: "sym_low1", weight: 30 },
        { id: 1, name: "sym_low2", weight: 25 },
        { id: 2, name: "sym_high1", weight: 15 },
        { id: 3, name: "sym_wild", weight: 5 },
        { id: 4, name: "sym_scatter", weight: 3 },
    ],
    animationStrategy: "cascade",  // or "spin"
};
```

### Presentation Acts

Acts are the heart of slot game presentation. Each act wraps a GSAP timeline:

```js
import { PresentationAct } from "onearm/slots";

class MyWinAct extends PresentationAct {
    get guard() { return this.data.totalWin > 0; }  // skip if no win

    action() {
        this.timeline.add(this.reelsScene.playWinAnimation(this.data.pays));
        this.timeline.playSfx("win_sound");
        return this.timeline;
    }

    skip() { /* instant version for fast-forward */ }
}
```

Acts are composed into a scenario:

```js
const scenario = new AsyncActionsScenario({
    actions: [
        new AsyncAction({ actionCallback: () => stopReelsAct.action() }),
        new AsyncAction({ actionCallback: () => paysAct.action(), guard: () => hasWin }),
        new AsyncAction({ actionCallback: () => goToNextStateAct.action() }),
    ],
});
scenario.start();
```

### Game Flow Pattern (Full Slot Loop)

```js
async function slotLoop(scope, ctx) {
    const { scenes } = ctx;
    const gameLogic = services.get("gameLogic");
    const reelsScene = scenes.get("ReelsScene");

    while (true) {
        // Wait for spin trigger
        const action = await scope.run(idle, ctx);

        if (action === "spin") {
            // Start spin animation + API call in parallel
            reelsScene.reels.startSpin();
            const result = await gameLogic.spin();

            // Run presentation acts
            await scope.run(presentation, ctx, result);
        }
    }
}
```

## Creating a New Game

1. Copy `games/template/` to `games/<your-game>/`
2. Update `assets/config.json` with game name
3. Add asset bundles to `resources-manifest.js`
4. Create scenes (ReelsScene, HUDScene, etc.)
5. Build flows: logo → preloader → main → slotLoop
6. Configure reels, symbols, and acts
7. Run: `npm run dev -- -game=<your-game>`

## UI Components

**Button** — multiple creation patterns:
```js
import { Button } from "onearm";

// 4-texture pattern (name_btn_default, _hover, _pressed, _disabled)
new Button({ name: "spin" });

// Single image with scale animation
new Button({ image: "btn_spin", animation: { hover: 1.03, press: 0.95 } });

// With text
new Button({ name: "action", text: "PLAY", textStyle: "ButtonLabel" });

button.on("clicked", handler);
button.enabled = false;
```

**Slider** — continuous or discrete steps:
```js
import { Slider } from "onearm";

new Slider({ bg, fill, slider, steps: [0.5, 1, 2, 5, 10] });
slider.onChange.connect(value => { /* bet changed */ });
```

**CheckBox**:
```js
import { CheckBoxComponent } from "onearm";

new CheckBoxComponent({ checked: "cb_on", unchecked: "cb_off", value: false });
checkbox.onChange.connect(value => { /* toggled */ });
```

## GSAP Integration

GSAP is the animation backbone. Engine provides plugins:
- **AudioGsapPlugin** — `timeline.playSfx("name")`, `timeline.stopSfx("name")`
- **SpineGsapPlugin** — drive Spine animations on GSAP timelines
- **PixiGsapPlugin** — PIXI-specific tweening

**SpineTimeline** — preferred for acts (GSAP-controlled Spine):
```js
const spine = new SpineTimeline({ skeleton: spineData, animation: "idle" });
const tl = spine.timeline({ animation: "win", timeScale: 1.5 });
mainTimeline.add(tl, "+=0.05");
```

## Key Patterns

| Pattern | Usage |
|---------|-------|
| Flow chaining | `return nextFlow` from async flow functions |
| scope.defer | Cleanup when flow/scope exits (scene removal, destroy) |
| scope.run | Child scope for sub-phases (idle, spinning, presentation) |
| PresentationAct | Each act returns GSAP timeline, composed via AsyncActionsScenario |
| Strategy | Reel animation (CascadeStrategy vs SpinStrategy) |
| ObjectFactory | Register and create display objects by name |
| SymbolPool | Reuse Spine-based symbols (max 5 per type) |
| Signal (typed-signals) | Event communication, auto-disconnect via scope/BaseState |
