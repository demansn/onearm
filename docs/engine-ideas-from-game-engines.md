# Ideas from Game Engines for onearm

Cross-engine analysis: Unity, CryEngine, Godot, Phaser, Unreal Engine.
Each idea evaluated for simplicity (< 300 LOC), usefulness for slot games, and absence in onearm.

---

## Priority Tiers

### Tier 1 — High Impact, Low Effort (implement first)

These ideas solve real architectural problems and are under 100 lines each.

---

#### 1. Gameplay Cues — event-driven effects bus
**Sources:** UE Gameplay Cues, CryEngine Flow Graph, Godot Groups.call

Game logic fires a tag, all effect systems react independently. Acts become pure logic — no direct calls to audio, particles, or UI.

```js
// CueSystem.js — ~80 lines
export class CueSystem {
    #handlers = []; // { tag, handler }

    on(tag, handler) {
        this.#handlers.push({ tag, handler });
        return () => { this.#handlers = this.#handlers.filter(h => h.handler !== handler); };
    }

    fire(tag, payload = {}) {
        for (const { tag: t, handler } of this.#handlers) {
            if (tag === t || tag.startsWith(t + ".")) handler(payload, tag);
        }
    }
}

// Registration — separate file per game:
cues.on("win",          ({ amount }) => winCounter.animateTo(amount));
cues.on("win.big",      ({ amount }) => bigWinOverlay.show(amount));
cues.on("win",          () => audio.playSfx("win"));
cues.on("freespins.start", () => audio.playMusic("freespins"));

// In PaysAct — pure logic, no effect knowledge:
cues.fire(totalWin > 500 ? "win.mega" : "win", { amount: totalWin });
```

**Why it matters for slots:** Acts currently know about audio, particles, counters, overlays. Adding a new effect means changing existing act code. Cues decouple completely — new effects are added without touching game logic.

**Complexity:** ~80 lines. **Priority:** Critical.

---

#### 2. Gameplay Tags — hierarchical state identifiers
**Source:** UE FGameplayTag

Replace flat string constants with hierarchical tags. `hasTag("game.spin")` matches both `"game.spin.normal"` and `"game.spin.auto"`.

```js
// ~30 lines core
export function hasTag(current, query) {
    return current === query || current.startsWith(query + ".");
}

// Usage:
if (hasTag(state, "game.spin")) spinButton.enabled = false; // any spin state
if (hasTag(state, "game.freespins")) audio.switchMusic("freespins");
```

**Why it matters:** Eliminates if-else chains when adding new game modes (bonus buy, respin, jackpot). New states auto-match parent tag listeners.

**Complexity:** ~50 lines. **Priority:** High.

---

#### 3. Registry — reactive cross-scene shared state
**Sources:** Phaser Registry, Unity ScriptableObject

In-memory key-value store with typed-signals. Not persisted (unlike DataModel). For data shared between scenes: balance, last win, free spins count.

```js
// ~35 lines
export class Registry extends Service {
    #data = {};
    #signals = {};

    set(key, value) {
        const old = this.#data[key];
        if (old === value) return;
        this.#data[key] = value;
        this.#getSignal(key).emit(value, old);
    }

    get(key, defaultValue) { return this.#data[key] ?? defaultValue; }
    onChange(key) { return this.#getSignal(key); }

    #getSignal(key) {
        if (!this.#signals[key]) this.#signals[key] = new Signal();
        return this.#signals[key];
    }
}

// HUD subscribes reactively:
registry.onChange("balance").connect(val => balanceLabel.text = formatMoney(val));
// GameLogic updates:
registry.set("balance", spinResult.balance);
```

**Why it matters:** Currently no standard reactive channel for cross-scene data. Games either use DataModel (with localStorage overhead) or pass data through flow context manually.

**Complexity:** ~35 lines. **Priority:** High.

---

#### 4. CVars — runtime-tunable variables for dev/QA
**Sources:** UE Console Variables, CryEngine ICVar

Named variables with getters/setters, accessible from browser console. Separate from game data — these are engine/game configuration parameters.

```js
// ~80 lines
export class CVars {
    #vars = new Map();

    register(name, defaultValue, { min, max } = {}) {
        this.#vars.set(name, { value: defaultValue, defaultValue, min, max, onChange: new Signal() });
        return this;
    }

    get(name) { return this.#vars.get(name)?.value; }

    set(name, value) {
        const cvar = this.#vars.get(name);
        if (cvar.min !== undefined) value = Math.max(cvar.min, value);
        if (cvar.max !== undefined) value = Math.min(cvar.max, value);
        if (cvar.value === value) return;
        cvar.value = value;
        cvar.onChange.emit(value);
    }
}

// In dev console: window.cvars.set("game.spinSpeed", 4)
```

**Why it matters:** QA can change animation speeds, skip presentations, force game states — all without rebuilds. Also enables URL params for CI: `?cvar.skipWinAnim=true`.

**Complexity:** ~80 lines. **Priority:** High.

---

#### 5. Scene Effects — shake / flash / fade
**Source:** Phaser Camera Effects

Utility class for common full-scene visual effects. Wraps GSAP.

```js
// ~70 lines
export class SceneEffects {
    constructor(container) { this.container = container; }

    shake(duration = 0.4, intensity = 8) {
        const origin = { x: this.container.x, y: this.container.y };
        return gsap.to(this.container, {
            x: `+=${intensity}`, duration: 0.04,
            repeat: Math.floor(duration / 0.04), yoyo: true, ease: "none",
            onComplete: () => Object.assign(this.container, origin),
        });
    }

    flash(duration = 0.3, color = 0xffffff) { /* Graphics overlay + GSAP */ }
    fadeIn(duration = 0.5) { return gsap.to(this.container, { alpha: 1, duration }); }
    fadeOut(duration = 0.5) { return gsap.to(this.container, { alpha: 0, duration }); }
}
```

**Why it matters:** Every slot game needs fade transitions, win flashes, bonus shakes. Currently reimplemented per game.

**Complexity:** ~70 lines. **Priority:** High.

---

#### 6. Object Pool
**Source:** Unity ObjectPool\<T\>

Generic pool with create/reset/destroy callbacks. Already have SymbolPool for Spine — this generalizes it.

```js
// ~100 lines (pool + PoolService)
const berryPool = pool.create("berry", {
    create: () => new Berry(),
    reset: (b) => { b.alpha = 1; b.visible = true; },
    maxSize: 20,
});

const berry = berryPool.get();
// ...animate...
berryPool.release(berry);
```

**Why it matters:** Cascade mechanics destroy/create hundreds of symbols per spin. Plinko creates berries continuously. Pool eliminates GC pauses during critical animations.

**Complexity:** ~100 lines. **Priority:** High.

---

### Tier 2 — Medium Impact, Low Effort (implement second)

---

#### 7. Scoped Subsystems — temporary services in flow scope
**Source:** UE Subsystems

Extend `createScope` with `scope.service()` — a mini-service that auto-destroys when flow exits.

```js
// ~30 lines addition to createScope
async function freespinsFlow(scope, ctx) {
    const counter = scope.service(() => ({
        remaining: 10, total: 0,
        decrement() { this.remaining--; },
        destroy() { /* cleanup */ }
    }));

    while (counter.remaining > 0) {
        const result = await scope.run(spinFlow, ctx);
        counter.total += result.win;
        counter.decrement();
    }
    // counter auto-destroyed on scope exit
}
```

**Why it matters:** Freespins/bonus state currently lives in closures or global DataModel. Scoped services guarantee no state leaks between rounds.

**Complexity:** ~30 lines. **Priority:** Medium-High.

---

#### 8. Data Tables — typed config tables
**Sources:** UE DataTable, Unity ScriptableObject

Formalized pattern for tabular game data (pay tables, multipliers, symbol configs) with dev-mode validation.

```js
// ~70 lines
const SymbolsTable = new DataTable({
    id: "string", name: "string", payout3: "number", payout5: "number"
}).load([
    { id: "WILD",  name: "Wild",    payout3: 0,  payout5: 0 },
    { id: "HIGH1", name: "Diamond", payout3: 5,  payout5: 100 },
]);

const payout = SymbolsTable.get("HIGH1").payout5 * bet;
```

**Why it matters:** Pay tables change per regulatory market (94% RTP UK, 96% Malta). Designers need to edit numbers without touching code.

**Complexity:** ~70 lines. **Priority:** Medium.

---

#### 9. Animation Notifies — named events in timelines
**Sources:** UE AnimNotify, Unity Animation Events

Named callback points inside GSAP timelines. Separates animation authoring from effect triggering.

```js
// ~80 lines
const anim = new AnimNotifyTimeline();
anim.tl
    .to(symbol, { y: finalY, duration: 0.3 })
    .to(symbol, { scaleX: 1.1, duration: 0.05, yoyo: true, repeat: 1 });

anim.notify("land", 0.3);
anim.on("land", () => audio.playSfx("reel_stop"));
anim.on("land", () => particles.burst(symbol.x, symbol.y));
await anim.play();
```

**Why it matters:** Sound sync with animation frames is critical in slots. "Coin hits basket" must sound at contact moment, not on a timer.

**Complexity:** ~80 lines. **Priority:** Medium.

---

#### 10. Groups — tags on display objects
**Source:** Godot Node Groups

Tag containers with string labels. Query by tag across the scene tree without knowing hierarchy.

```js
// ~80 lines
scene.groups.add(symbol, "wilds");
scene.groups.add(symbol, "symbols");

// Batch operations:
scene.groups.call("symbols", "setEnabled", false);
scene.groups.get("wilds").forEach(s => s.playAnimation("idle"));
```

**Why it matters:** Slots constantly operate on categories — all wilds, all scatters, all active reels. Currently requires `findAll` + manual filtering.

**Complexity:** ~80 lines. **Priority:** Medium.

---

#### 11. Scene Transitions
**Source:** Phaser Scene Transitions

Centralized `scenes.transition(from, to, { type, duration })` with fade/slide/crossfade.

```js
// ~60 lines in SceneManager
const gameScene = await scenes.transition("IntroScene", "GameScene", {
    type: "fade", duration: 0.5,
});
```

**Why it matters:** Intro to game, game to bonus, game to big-win — all need smooth transitions. Currently reimplemented in every flow.

**Complexity:** ~60 lines. **Priority:** Medium.

---

#### 12. PauseMode — declarative pause control per object
**Source:** Godot process_mode

Each container declares whether it stops during game pause (`PAUSABLE`), always runs (`ALWAYS`), or inherits from parent.

```js
// ~50 lines
const PauseMode = { INHERIT: "inherit", PAUSABLE: "pausable", ALWAYS: "always" };

// ReelsScene: pauseMode = PauseMode.PAUSABLE  — stops during pause
// PopupScene: pauseMode = PauseMode.ALWAYS     — always updates
```

**Why it matters:** Modals, rules, free spins intro — all need game pause. Currently `gsap.globalTimeline.pause()` stops everything including popup animations.

**Complexity:** ~50 lines. **Priority:** Medium.

---

### Tier 3 — Nice to Have (implement as needed)

---

#### 13. Enhanced Input / Action Mappings
**Source:** UE Enhanced Input System

Abstract input from specific buttons/keys. One config maps abstract actions to concrete inputs.

```js
// ~100 lines
// GameConfig.inputActions
inputActions: {
    spin:   { key: "Space", touch: "swipe_down", button: "SpinButton" },
    turbo:  { key: "Space+hold", touch: "double_tap" },
    skip:   { key: "Space", touch: "tap" },  // context-dependent (during presentation)
    menu:   { key: "Escape", touch: "swipe_up", button: "MenuButton" },
}

// In flow — listen to abstract action, not concrete input:
await waitForSignal(input.onAction("spin"));

// Rebinding for accessibility:
input.rebind("spin", { key: "Enter" });
```

**Why it matters:** Keyboard shortcuts, mobile touch, button clicks — all trigger the same game actions. Currently each input source is wired separately. Action mappings create one config point.

**Complexity:** ~100 lines. **Priority:** Low-Medium.

---

#### 14. Debug Panel — live Inspector for game state
**Source:** Unity Inspector

Dev-only floating panel showing current game state in real time: flow, state machine, balance, bet, features active, reel positions. Values are editable.

```js
// ~500 lines (HTML overlay + reactive bindings)
// Auto-generated from CVars + Registry + StateMachine

// Activation: URL param ?debug=panel or keyboard shortcut
// Shows:
// - Current flow: gameFlow > freespinsFlow
// - State: game.freespins.spinning
// - Balance: 1500 [edit]
// - Bet: 10 [edit]
// - Free spins remaining: 7
// - CVars: spinSpeed=2, skipWinAnim=false [toggles]
// - FPS counter, draw calls, texture memory
```

**Why it matters:** Eliminates console.log debugging. QA sees everything at a glance. Designers tune parameters live. Biggest dev experience improvement possible.

**Complexity:** ~500 lines (largest item). **Priority:** Low-Medium (high dev value but high effort).

---

#### 15. Declarative Reactions — config-driven event→effect mapping
**Source:** CryEngine Flow Graph

Unlike Gameplay Cues (code-based registration), this is a pure config approach. Effects are arrays of action strings resolved by the engine.

```js
// GameConfig.reactions — pure data, no code
reactions: [
    { on: "win.big",          do: ["camera.shake", "sfx.bigwin", "particles.coins"] },
    { on: "win.mega",         do: ["camera.shake.heavy", "sfx.megawin", "fullscreen.celebration"] },
    { on: "freespins.start",  do: ["music.switch.freespins", "ambient.dark"] },
    { on: "scatter.land",     do: ["sfx.scatter", "symbol.highlight"] },
]

// Engine resolves action strings to registered handlers:
reactionSystem.registerHandler("camera.shake", (payload) => sceneEffects.shake());
reactionSystem.registerHandler("sfx.*", (payload, tag) => audio.playSfx(tag.split(".")[1]));
```

**Why it matters:** Extends Gameplay Cues with a config layer. Game designers edit reactions without touching JS. Useful when games have many small effect variations that don't warrant code changes.

**Complexity:** ~120 lines (resolver + config parser). **Priority:** Low (Cues solve 80% of this).

---

#### 16. Addressables — lazy load AND unload resource groups
**Source:** Unity Addressables

Extends Soft References (#21) with explicit group preloading and memory release. Critical for games with heavy bonus assets.

```js
// ~150 lines (extends ResourceLoader)
// Preload before entering bonus:
await assets.preloadGroup("freespins"); // loads spine anims, extra textures

// Use normally:
const spine = assets.get("bonus_character");

// Release after leaving bonus — frees GPU memory:
assets.releaseGroup("freespins");

// Lazy single asset:
const texture = await assets.load("rare_symbol"); // loads its bundle if needed
```

**Why it matters:** Slot games with multiple bonus rounds (Megaways + free spins + jackpot wheel) can exceed 200MB of assets. Loading everything upfront causes slow initial load. Release after use prevents mobile OOM crashes.

**Complexity:** ~150 lines. **Priority:** Low (needed only for asset-heavy games).

---

#### 17. TimerEvent — loopable, pausable timers
**Source:** Phaser Timer Events

Replace manual `setTimeout` recursion with `TimerEvent({ delay, loop, repeat })`. Integrates with scope for auto-cleanup.

**Complexity:** ~50 lines. **Priority:** Low-Medium.

---

#### 18. Behavior Props Schema — @export-style declarative options
**Source:** Godot @export

Static `props` field on LayoutController for self-documenting required/optional options with defaults.

```js
class SpinButtonBehavior extends LayoutController {
    static props = {
        buttonName: { required: true },
        autoDelay:  { default: 3000 },
    };
}
```

**Complexity:** ~30 lines. **Priority:** Low-Medium.

---

#### 19. connectOnce — one-shot signal handler
**Source:** Godot CONNECT_ONE_SHOT

```js
// In LayoutController — ~15 lines
connectOnce(signal, handler) {
    let conn;
    conn = signal.connect((...args) => { conn.disconnect(); handler(...args); });
    this._signalConnections.push(conn);
}
```

**Complexity:** ~15 lines. **Priority:** Low.

---

#### 20. Entity Links — declarative behavior-to-behavior connections
**Source:** CryEngine Entity Links

Behaviors reference other behaviors by alias, resolved from config. No direct scene/service lookups.

```js
behaviors: {
    SpinButton: {
        Behavior: SpinButtonBehavior,
        links: { reels: "ReelsBehavior", hud: "BalanceBehavior" },
    }
}
```

**Complexity:** ~40 lines. **Priority:** Low.

---

#### 21. Transition Guards — explicit state machine transitions
**Source:** CryEngine Schematyc

Replace open `goTo()` with `send(event)` + declared transition table.

```js
transitions: [
    { from: "idle",       event: "SPIN",   to: "spinning" },
    { from: "presenting", event: "DONE",   to: "idle",     guard: () => !autoplay.isActive() },
    { from: "presenting", event: "DONE",   to: "spinning", guard: () => autoplay.isActive() },
]
```

**Complexity:** ~60 lines. **Priority:** Low.

---

#### 22. Soft References — lazy asset loading by name
**Source:** UE TSoftObjectPtr

```js
const WildTexture = softRef("wild_symbol", "bonus-bundle");
const texture = await WildTexture.resolve(resources); // loads bundle if needed
```

**Complexity:** ~50 lines. **Priority:** Low.

---

#### 23. Visual Presets — named scene mood configs
**Source:** CryEngine Material Layers

```js
visualPresets: {
    "normal":    { brightness: 1, saturation: 1, tint: null },
    "freespins": { brightness: 0.8, saturation: 1.2, tint: 0x1a0033 },
}
scene.applyPreset("freespins", { duration: 0.5 });
```

**Complexity:** ~100 lines. **Priority:** Low.

---

#### 24. AnimationBehavior — named animation registry on components
**Source:** Godot AnimationPlayer

```js
behaviors: {
    WildSymbol: {
        Behavior: AnimationBehavior,
        animations: {
            idle: (layout) => gsap.to(layout, { alpha: 0.8, yoyo: true, repeat: -1 }),
            win:  (layout) => gsap.timeline().to(layout, { scale: 1.3, duration: 0.15 })...
        },
        autoPlay: "idle",
    },
}
// In act: symbol.behavior.play("win");
```

**Complexity:** ~80 lines. **Priority:** Low.

---

#### 25. Animation LOD — quality levels for presentations
**Source:** CryEngine LOD concept

CVar `game.animQuality` switches between `"high"` (full effects), `"medium"` (simplified), `"low"` (instant). Autoplay runs on `"low"`.

**Complexity:** ~50 lines + convention per act. **Priority:** Low.

---

#### 26. Dev Console Commands — registered dev actions
**Source:** UE/CryEngine Console Commands

```js
devConsole.register("triggerBigWin", (amount) => gameLogic.forceBigWin(amount));
devConsole.register("addFreeSpins", (n) => gameLogic.addFreeSpins(n));
devConsole.exposeToWindow(); // window.__dev.triggerBigWin(5000)
```

**Complexity:** ~70 lines. **Priority:** Low (CVars cover most needs).

---

#### 27. Deferred Queue — end-of-frame execution
**Source:** Godot call_deferred

Safe place to add/remove display objects during iteration.

**Complexity:** ~60 lines. **Priority:** Low.

---

## Implementation Roadmap

### Phase 1 — Core Architecture (Tier 1)
Total: ~450 lines

1. **Gameplay Cues** (80 LOC) — decouple effects from game logic
2. **Gameplay Tags** (50 LOC) — hierarchical state identifiers
3. **Registry** (35 LOC) — reactive cross-scene state
4. **CVars** (80 LOC) — runtime tuning for dev/QA
5. **Scene Effects** (70 LOC) — shake/flash/fade
6. **Object Pool** (100 LOC) — GC-free object reuse
~~7. **Async Primitives** — DONE, see `modules/engine/flow/async.js`~~

### Phase 2 — Quality of Life (Tier 2)
Total: ~480 lines

7. Scoped Subsystems (30 LOC)
8. Data Tables (70 LOC)
9. Animation Notifies (80 LOC)
10. Groups (80 LOC)
11. Scene Transitions (60 LOC)
12. PauseMode (50 LOC)

### Phase 3 — As Needed (Tier 3)
Pick based on game requirements. ~1000 lines total if all implemented.

13. Enhanced Input / Action Mappings (100 LOC)
14. Debug Panel (500 LOC)
15. Declarative Reactions (120 LOC)
16. Addressables with unload (150 LOC)
17-27. TimerEvent, Props Schema, connectOnce, Entity Links, Transition Guards, Soft Refs, Visual Presets, AnimationBehavior, Animation LOD, Dev Console, Deferred Queue

---

## Cross-Engine Pattern Summary

| Pattern | UE | Unity | CryEngine | Godot | Phaser |
|---------|:--:|:-----:|:---------:|:-----:|:------:|
| Event Bus / Cues | Gameplay Cues | — | Flow Graph | Groups.call | — |
| Declarative Reactions | — | — | Flow Graph config | — | — |
| Hierarchical Tags | Gameplay Tags | — | — | — | — |
| Reactive Store | — | ScriptableObject | — | — | Registry |
| Runtime Config | CVars | — | CVars | — | — |
| Scene Effects | — | — | — | — | Camera Effects |
| Object Pool | — | ObjectPool\<T\> | — | — | — |
| Async Primitives | Latent Actions | Coroutines | — | — | — |
| Scoped Services | Subsystems | — | — | — | — |
| Data Tables | DataTable | ScriptableObject | — | — | — |
| Anim Events | Notifies | Anim Events | Track View | AnimationPlayer | Tween callbacks |
| Object Tags | — | — | Entity Links | Groups | — |
| Scene Transitions | — | — | — | — | Scene Transition |
| Pause Control | — | — | — | process_mode | sleep/wake |
| Timer Events | — | — | — | — | Timer Events |
| Props Schema | — | — | — | @export | — |
| State Guards | — | — | Schematyc | — | — |
| Lazy Loading | Soft Refs | Addressables | — | Resource preload | — |
| Input Abstraction | Enhanced Input | — | — | InputMap | — |
| Debug Inspector | Gameplay Debugger | Inspector | — | — | — |
