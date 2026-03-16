# Animation Clips

System for reusable, overridable GSAP animations in the slot engine.

## Architecture: 3 Layers

```
Layer 1: Clip Functions       — pure functions, 1 file = 1 animation → Timeline
Layer 2: Composition Helpers  — sequence(), parallel(), stagger()
Layer 3: Animation Registry   — name → function map, game overrides by name
```

Acts remain orchestrators — they use clips from the registry and compose via helpers.

## Layer 1: Clip Functions

Location: `modules/slots/animations/clips/`

**Convention:**
- File name = function name = registry key
- First argument: target(s). Second: `options = {}` with defaults
- Always returns `gsap.core.Timeline`
- SFX via `timeline.playSfx()`
- No side effects outside the Timeline (except necessary DOM operations like `addChild`)

### Available clips

| Clip | Source | Description |
|---|---|---|
| `symbolWin` | ReelSymbol | Win effect: spine "out" + effect overlay |
| `symbolDestroy` | ReelSymbol | Destroy animation (scale down + fade) |
| `symbolDrop` | ReelSymbol | Drop/fall-in spine animation |
| `symbolTrigger` | ReelSymbol | Free spins trigger animation |
| `multiplierFly` | ReelSymbol | Multiplier badge fly to target |
| `winCounter` | PaysAct | Win counter increment animation |
| `payPresentation` | PaysAct | Full pay presentation orchestration |
| `multiplierPresentation` | MultiplierAct | Multiplier fly + counter update |
| `cascade` | CascadeAct | Cascade drop animation |
| `plinkoBall` | Container | Plinko ball trajectory playback from pre-recorded keyframes |

### Example clip

```js
// clips/symbolWin.js
import gsap from "gsap";
import { SpineTimeline } from "../../../engine/index.js";

export function symbolWin(symbol, { timeScale = 1.5, skip = false } = {}) {
    const tl = gsap.timeline();

    const destroySpine = new SpineTimeline({
        spine: "effect",
        atlas: "effect_symbols",
    });
    symbol.content.addChild(destroySpine);
    symbol.destroySpine = destroySpine;

    tl.set(destroySpine, { pixi: { alpha: 0, scaleX: 1.5, scaleY: 1.5 } });
    tl.add(skip ? gsap.timeline() : symbol.spine.timeline({ animation: "out", timeScale }));
    tl.add([
        skip ? gsap.to(symbol.spine, { alpha: 0, duration: 0.05 }) : null,
        tl.set(destroySpine, { alpha: 1 }),
        destroySpine.timeline({ animation: "effect_out", timeScale }),
    ], "-=0.05");

    return tl;
}
```

## Layer 2: Composition Helpers

Location: `modules/slots/animations/compose.js`

```js
import { sequence, parallel, stagger } from "onearm";

// Sequential — items play one after another
const tl = sequence([
    () => hud.showWinInfo(),
    payPresentation(pay1, ctx),
    payPresentation(pay2, ctx),
    () => hud.clearPayInfo(),
]);

// Parallel — all items start at position 0
const tl = parallel([
    symbolWin(symbol1),
    symbolWin(symbol2),
    winCounter(target, { win: 100, duration: 1 }),
]);

// Stagger — factory called for each item with delay
const tl = stagger(symbols, (symbol) => symbolWin(symbol), 0.1);
```

**Accepted item types:** Timeline, Tween, Function, number (delay), null (skipped).

## Layer 3: Animation Registry

Location: `modules/slots/animations/AnimationRegistry.js`

Registered as a service (`animations`) in `ServicesConfig`. Default clips are loaded on init, then overridden by `GameConfig.animations`.

### Usage in acts

```js
// Get registry via EngineContext
this.anim = getEngineContext().services.get("animations");

// Call clip from registry
this.anim.get("payPresentation")(pay, { reels, hud, counterTarget: this, isTurbo });

// Check if clip exists
if (this.anim.has("customEffect")) { ... }
```

### Game override via GameConfig

```js
// game/src/configs/GameConfig.js
import { symbolWin as customSymbolWin } from "../animations/symbolWin.js";

export const GameConfig = {
    services: { ... },
    animations: {
        symbolWin: customSymbolWin,  // overrides default engine clip
    },
};
```

`AnimationRegistry.init()` automatically:
1. Registers all default engine clips
2. Overrides with clips from `GameConfig.animations`

### API Reference

```js
registry.register(name, factory)     // Register single clip
registry.registerAll(module)         // Register all functions from module/object
registry.get(name)                   // Get clip (throws if not found)
registry.has(name)                   // Check if clip exists
```

## DO

- Return `gsap.timeline()` from every clip
- Accept options with defaults: `({ timeScale = 1.5, skip = false } = {})`
- Use `timeline.playSfx()` for sounds inside clips
- Keep clips focused — one visual effect per clip
- Use `sequence()` / `parallel()` in acts for readability
- Override clips via `GameConfig.animations`

## DON'T

- Return a Tween instead of Timeline — always wrap in `gsap.timeline()`
- Mutate objects directly outside Timeline callbacks — use `tl.set()` / `tl.add(() => ...)`
- Call `registry.get()` inside a clip — clips should be pure functions, not depend on registry
- Hardcode timings without options — expose them as configurable parameters
- Access global state inside clips — receive everything through arguments

## Compatibility

- **Skip system** — unchanged. `AsyncAction` kills timeline → kill propagates through nested timelines
- **Flow system** — unchanged. `createScope`, `gameFlowLoop` not affected
- **GSAP plugins** — `playSfx`, `spine`, `money`, `parentLayer` work inside clips normally
- **ActsRunner** — unchanged. Acts still return Timeline from `action()`

## How acts use clips (example)

Before (inline animation in PaysAct):
```js
makePaysAnimation() {
    const timeline = gsap.timeline();
    timeline.add(() => this.hud.showWinInfo());
    this.result.pays.forEach(pay => {
        timeline.add(this.makePayAnimation(pay));  // 30+ lines inline
    });
    timeline.add(() => this.hud.clearPayInfo());
    return timeline;
}
```

After (using registry + composition):
```js
makePaysAnimation() {
    const timeline = gsap.timeline();
    timeline.add(() => this.hud.showWinInfo());
    this.result.pays.forEach(pay => {
        timeline.add(this.anim.get("payPresentation")(pay, {
            reels: this.reels,
            hud: this.hud,
            counterTarget: this,
            isTurbo: this.isTurboSpin,
        }));
    });
    timeline.add(() => this.hud.clearPayInfo());
    return timeline;
}
```

Acts get the registry via `getEngineContext().services.get("animations")` in their constructor.

## See also

- `docs/gameplay-cues.md` — higher-level event system (cues for game state changes, clips for visual choreography)
- `docs/async-primitives.md` — flow timing utilities (delay, waitForSignal)
- `docs/engine-ideas-from-game-engines.md` — design philosophy behind decoupling acts from effects
- `docs/plinko-physics-recordings.md` — pre-recorded physics system for Plinko (uses `plinkoBall` clip)
