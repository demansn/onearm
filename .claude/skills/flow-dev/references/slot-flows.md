# Slot Flow Reference

Complete reference for slot game flows using functional scope-based pattern. These are the standard flows every slot game implements.

## Game Loop Entry Point

```js
// In main flow, after boot chain:
export async function main(scope, ctx) {
    ctx.scenes.show("HUDScene");
    scope.defer(() => ctx.scenes.remove("HUDScene"));

    // Game loop
    while (true) {
        await scope.run(idle, ctx);
    }
}
```

## idle

Waits for user input, routes to the appropriate flow.

```js
async function idle(scope, ctx) {
    const { hud, reels, autoplay, store } = ctx;

    hud.toIdleState();
    reels.toIdleState();
    hud.display.setBalance(store.balance);
    hud.display.setTotalBet(store.bet);

    // Autoplay skips user input
    if (autoplay.isActive()) {
        await scope.run(spinning, ctx);
        return;
    }

    const action = await hud.waitAction();
    await routeAction(scope, ctx, action);
}

async function routeAction(scope, ctx, action) {
    const routes = {
        spin: spinning,
        buyBonus: buyBonus,
        info: info,
        settings: settings,
        autoplaySettings: autoplaySettings,
    };
    const flow = routes[action.type];
    if (flow) await scope.run(flow, ctx);
}
```

## spinning

Starts animation + API call in parallel, handles skip and errors.

```js
async function spinning(scope, ctx) {
    const { hud, reels, api, store, audio } = ctx;
    const isTurbo = store.spinType === "turbo";
    const isQuick = store.spinType === "quick" || isTurbo;

    hud.toSpinningState();
    audio.playSfx("spin_button_click");

    const skipController = createSkipController();
    scope.defer(() => skipController.dispose?.());
    if (isTurbo) skipController.skip();

    try {
        // Parallel: animation + API
        const spinAnimation = reels.spin({ instant: isQuick });
        const resultPromise = api.spin(store.bet);

        store.deductBet();
        hud.display.setBalance(store.balance);

        const result = await resultPromise;
        if (result.error) {
            await scope.run(errorFlow, ctx, result.error);
            return;
        }

        store.setSpinResult(result);

        // Race: animation vs skip
        await Promise.race([spinAnimation.finished, skipController.onSkip]);
        if (skipController.isSkipped) spinAnimation.complete();

        await scope.run(presentation, ctx, {
            result,
            quickStop: skipController.isSkipped || isQuick,
            isTurbo,
        });
    } catch (error) {
        await scope.run(errorFlow, ctx, error);
    }
}
```

## presentation

Runs presentation acts from server data. Extensible for free spins.

```js
async function presentation(scope, ctx, params) {
    const skipController = createSkipController();
    scope.defer(() => skipController.dispose?.());

    if (ctx.autoplay.isActive() && ctx.autoplay.isTurboSpin) {
        skipController.skip();
    }

    const actMap = ctx.presentationActs;

    // Build acts from server result order
    const acts = params.result.results
        .map(step => {
            const ActClass = actMap[step.type];
            return ActClass ? new ActClass(ctx, step) : null;
        })
        .filter(Boolean);

    const scenario = new AsyncActionsScenario(acts);

    // Wire skip
    if (!skipController.isSkipped) {
        skipController.onSkip.then(() => scenario.skipAllIfPossible());
    } else {
        scenario.skipAllIfPossible();
    }

    scenario.start();
    await scenario.onComplete;

    // Update autoplay
    if (ctx.autoplay.isActive()) {
        ctx.autoplay.next({
            win: ctx.store.totalWin,
            loss: ctx.store.totalWin === 0 ? ctx.store.bet : 0,
        });
    }

    // Route next
    if (ctx.store.hasFreeSpins()) {
        await scope.run(freeSpinIntro, ctx);
    }
    // Otherwise returns to idle loop
}
```

## Free Spins Flows

### freeSpinIntro
```js
async function freeSpinIntro(scope, ctx) {
    const { hud, audio, store, background } = ctx;
    await hud.popups.showFreeSpinsIntro(store.freeSpinsCount);
    background.toFreeSpinsMode();
    audio.playMusic("freegame_loop", { loop: true });
    await hud.toFreeSpinsMode();
    scope.defer(() => {
        background.toBaseGameMode();
        audio.playMusic("basegame_loop", { loop: true });
    });

    // Free spins loop
    while (ctx.store.freeSpinsLeft > 0) {
        await scope.run(freeSpinIdle, ctx);
    }

    await scope.run(freeSpinOutro, ctx);
}
```

### freeSpinIdle
```js
async function freeSpinIdle(scope, ctx) {
    ctx.hud.toFreeSpinIdleState();
    ctx.hud.display.setFreeSpinsCounter(ctx.store.freeSpinsLeft);
    await delay(500);
    await scope.run(freeSpinning, ctx);
}
```

### freeSpinning
Same as spinning but calls `api.freeSpin()` instead of `api.spin(bet)` and decrements free spins counter. Routes to `freeSpinPresentation`.

### freeSpinPresentation
Same as presentation but uses `freeSpinPresentationActs` config.

### freeSpinOutro
```js
async function freeSpinOutro(scope, ctx) {
    const { hud, store } = ctx;
    await hud.popups.showFreeSpinsOutro(store.totalFreeSpinsWin);
    await hud.toMainGameMode();
}
```

## Utility Flows

### errorFlow
```js
async function errorFlow(scope, ctx, error) {
    if (error.custom_message === "-1") {
        ctx.store.rejectBet();
        ctx.hud.display.setBalance(ctx.store.balance);
        return;
    }
    await ctx.hud.popups.showError(error);
}
```

### info / settings
Simple popup flows: show popup, await close.

### buyBonus / autoplaySettings
Show popup, if confirmed execute the action.

## Skip Controller

Factory function for skip/fast-forward control:

```js
function createSkipController() {
    let isSkipped = false;
    let resolveSkip = null;
    const onSkip = new Promise(resolve => { resolveSkip = resolve; });
    return {
        get isSkipped() { return isSkipped; },
        get onSkip() { return onSkip; },
        skip() { if (!isSkipped) { isSkipped = true; resolveSkip?.(); } }
    };
}
```

Typically wired to HUD skip button and autoplay stop via scope.on().

## Acts Integration

Flows don't control individual act animations — they delegate to `AsyncActionsScenario`:

1. Server returns `result.results = [{ type: "stop", ... }, { type: "pays", ... }, ...]`
2. Flow maps each step to its act class via `presentationActs` config
3. `AsyncActionsScenario` runs acts sequentially with skip/guard logic
4. Flow awaits `scenario.onComplete` then routes to next flow

The `presentationActs` config is a map defined in the game:
```js
const presentationActs = {
    stop: StopReelsAct,
    pays: PaysAct,
    cascade: CascadeAct,
    symbols: SymbolsAnimationAct,
    // ...
};
```
