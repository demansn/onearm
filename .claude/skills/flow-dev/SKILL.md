---
name: flow-dev
description: "Skill for creating correct, clean game flows on the onearm engine. Use whenever the user wants to create a new flow, modify an existing flow, build a game loop, add a new game state (idle, spinning, presentation, free spins, bonus, error), wire up flows with scenes and acts, or understand how flows work. Trigger on: flow, game loop, idle state, spin state, presentation state, free spins flow, boot chain, scope, defer, game state transition, flow chain, skip controller, BaseFlow, gameFlowLoop, createScope. Also use when the user is creating a new game and needs the flow architecture set up."
---

# Flow Development Skill

You help create correct, clean game flows for onearm slot games. Flows are the backbone of every game — they control what happens and in what order: boot sequence, game loop, spin logic, presentation, free spins, error handling.

**Always use ultrathink.** Flow bugs are subtle — a missing `scope.defer`, a wrong return value, or a misplaced `await` can cause resource leaks, broken transitions, or silent failures that only show up during play.

## Two Flow Styles

The engine supports two equivalent styles. Both work with the same infrastructure — choose based on complexity.

### Functional Flows (preferred for simple flows)

```js
async function myFlow(scope, ctx) {
    // setup
    ctx.scenes.show("MyScene");
    scope.defer(() => ctx.scenes.remove("MyScene"));

    // do work
    await ctx.resources.load("main");

    // return next flow (or undefined to stop)
    return nextFlow;
}
```

Driven by `gameFlowLoop(ctx, firstFlow)`. Each flow gets a fresh scope. The loop disposes the scope before calling the next flow. Sub-flows run via `scope.run(childFn, ctx)`.

### Class-Based Flows (for complex slot states)

```js
class MyFlow extends BaseFlow {
    async run() {
        // this.ctx — game context
        // this.onDispose(fn) — register cleanup
        // this.connectSignal(signal, fn) — subscribe with cleanup
        // this.waitSignal(signal) — one-shot wait
        // this.awaitFlow(ChildFlow) — inline sub-flow
        return new NextFlow(this.ctx);
    }
}
```

Driven by a custom game loop:
```js
async function gameLoop(ctx) {
    let flow = new IdleFlow(ctx);
    while (flow) {
        flow = await flow.execute(); // execute() wraps run() with dispose()
    }
}
```

## The Scope API

Every functional flow receives `(scope, ctx)`. Scope has four methods:

| Method | Purpose | Cleanup |
|--------|---------|---------|
| `scope.defer(fn)` | Register arbitrary cleanup | Runs on scope dispose (LIFO order) |
| `scope.on(signal, handler)` | Subscribe to typed-signal | Auto-disconnects on dispose |
| `scope.wait(signal)` | Wait for one signal emission | Resolves once, auto-disconnects |
| `scope.run(fn, ...args)` | Run child flow in own scope | Child scope disposes on return |

**Critical:** Always `defer` cleanup for anything you create — scenes, containers, event listeners. The scope disposes when the flow returns or throws, so cleanup is guaranteed.

## The ctx Object

`ctx = services.getAll()` — a flat object with all registered services. Standard keys:

| Key | Service | Common usage in flows |
|-----|---------|----------------------|
| `ctx.resources` | ResourceLoader | `resources.load("bundleName")` |
| `ctx.scenes` | SceneManager | `scenes.show("Name")`, `scenes.remove("Name")`, `scenes.get("Name")` |
| `ctx.audio` | AudioManager | `audio.playSfx("name")`, `audio.playMusic("name")` |
| `ctx.app` | RendererSystem | `app.root` (PIXI stage) |
| `ctx.data` | DataModel | Reactive key-value store |
| `ctx.controllerStore` | ControllerStore | Background reactive controllers |
| `ctx.keyboard` | KeyboardService | Keyboard input |
| `ctx.layers` | GameLayers | Layer management |

Games add their own services (gameLogic, gameMath, betsController, etc.) which also appear in ctx.

## Standard Boot Chain

Every game starts with a boot chain: `logo → preloader → main`. This is what `GameConfig.flow` points to.

```js
// logo.js — load preloader assets
export async function logo(scope, ctx) {
    await ctx.resources.load("preloader");
    return preloader;
}

// preloader.js — show loading screen, load main assets
export async function preloader(scope, ctx) {
    const scene = ctx.scenes.show("PreloaderScene");
    scope.defer(() => ctx.scenes.remove("PreloaderScene"));

    await ctx.resources.load("main", {
        onProgress(progress) {
            scene.setProgress(progress * 100);
        },
    });

    return main;
}

// main.js — show game UI, enter game loop
export async function main(scope, ctx) {
    ctx.scenes.show("HUDScene");
    scope.defer(() => ctx.scenes.remove("HUDScene"));

    // For simple games: park forever
    await new Promise(() => {});

    // For slot games: enter the game loop
    // while (true) {
    //     await scope.run(idle, ctx);
    //     ...
    // }
}
```

## Slot Game Loop (Class-Based)

For full slot games, the reference pattern uses class-based flows. Read `references/slot-flows.md` for the complete reference with all flow classes.

The flow graph:
```
idle → spinning → presentation → idle (loop)
                               → freeSpinIntro → freeSpinIdle → freeSpinning → freeSpinPresentation
                                                                                → freeSpinIdle (more spins)
                                                                                → freeSpinOutro → idle
idle → buyBonus → spinning (if confirmed)
idle → info/settings/autoplaySettings → idle
spinning/presentation → error → idle
```

Key patterns in the slot loop:

1. **Parallel API + animation:** Start reel animation and API call simultaneously, then `Promise.race` with skip controller
2. **Acts integration:** PresentationFlow maps server `result.results` array to act classes via `presentationActs` config, feeds them to `AsyncActionsScenario`
3. **Skip controller:** `createSkipController()` returns `{ isSkipped, onSkip, skip() }` — wired to HUD skip button with auto-cleanup
4. **Autoplay:** IdleFlow checks `autoplay.isActive()` and skips user input, PresentationFlow auto-skips in turbo mode
5. **Error handling:** try/catch in SpinningFlow and PresentationFlow routes to ErrorFlow

## Common Patterns

### Scene lifecycle in a flow
```js
async function myFlow(scope, ctx) {
    ctx.scenes.show("MyScene");
    scope.defer(() => ctx.scenes.remove("MyScene"));
    // scene exists for the lifetime of this flow
}
```

### Wait for user action
```js
async function idle(scope, ctx) {
    const hud = ctx.scenes.get("HUDScene");
    const action = await scope.wait(hud.spinButton.onPress);
    // action received, scope will clean up the signal subscription
}
```

### Sub-flow loop
```js
async function gameLoop(scope, ctx) {
    while (true) {
        await scope.run(idle, ctx);
        const result = await scope.run(spinning, ctx);
        await scope.run(presentation, ctx);
    }
}
```

### PIXI container cleanup
```js
async function myFlow(scope, ctx) {
    const container = new PIXI.Container();
    ctx.app.root.addChild(container);
    scope.defer(() => container.destroy({ children: true }));
}
```

## Creating a New Flow

1. Decide the style: functional for simple (boot, loading, popups), class-based for complex (game states with skip/autoplay)
2. Create the file in `games/<game>/src/flows/`
3. Wire cleanup for everything you create (`scope.defer` / `this.onDispose`)
4. Return the next flow or null
5. Wire it into the flow chain (return it from the previous flow)

## Common Mistakes to Avoid

- **Missing cleanup:** Every `scenes.show()` needs a matching `scope.defer(() => scenes.remove())`. Every PIXI container added to stage needs `scope.defer(() => container.destroy())`
- **Forgetting to return next flow:** If a flow returns `undefined`, the flow chain stops. Make sure the last statement is `return nextFlow`
- **Awaiting forever without cleanup:** `await new Promise(() => {})` parks the flow — make sure you set up cleanup BEFORE this line
- **Using scope after dispose:** Don't store scope references and use them later. The scope is only valid during the flow's execution
- **Not handling errors in API calls:** Always wrap API calls in try/catch or check `result.error` before proceeding
