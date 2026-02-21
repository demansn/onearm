# Slot Flow Reference

Complete reference for class-based slot game flows. These are the standard flow classes every slot game implements. The reference implementation is in `gameFlow.ts` at the project root.

## Game Loop Entry Point

```js
// In main flow, after boot chain:
export async function main(scope, ctx) {
    ctx.scenes.show("HUDScene");
    scope.defer(() => ctx.scenes.remove("HUDScene"));

    // Start the class-based game loop
    let flow = new IdleFlow(ctx);
    while (flow) {
        flow = await flow.execute();
    }
}
```

## IdleFlow

Waits for user input, routes to the appropriate flow.

```js
class IdleFlow extends BaseFlow {
    async run() {
        const { hud, reels, autoplay, store } = this.ctx;

        hud.toIdleState();
        reels.toIdleState();
        hud.display.setBalance(store.balance);
        hud.display.setTotalBet(store.bet);

        // Autoplay skips user input
        if (autoplay.isActive()) {
            return new SpinningFlow(this.ctx);
        }

        const action = await hud.waitAction();
        return this.routeAction(action);
    }

    routeAction(action) {
        const routes = {
            spin: SpinningFlow,
            buyBonus: BuyBonusFlow,
            info: InfoFlow,
            settings: SettingsFlow,
            autoplaySettings: AutoplaySettingsFlow,
        };
        const FlowClass = routes[action.type];
        return FlowClass ? new FlowClass(this.ctx) : new IdleFlow(this.ctx);
    }
}
```

## SpinningFlow

Starts animation + API call in parallel, handles skip and errors.

```js
class SpinningFlow extends BaseFlow {
    async run() {
        const { hud, reels, api, store, audio } = this.ctx;
        const isTurbo = store.spinType === "turbo";
        const isQuick = store.spinType === "quick" || isTurbo;

        hud.toSpinningState();
        audio.playSfx("spin_button_click");

        const skipController = this.createSkipController();
        if (isTurbo) skipController.skip();

        try {
            // Parallel: animation + API
            const spinAnimation = reels.spin({ instant: isQuick });
            const resultPromise = api.spin(store.bet);

            store.deductBet();
            hud.display.setBalance(store.balance);

            const result = await resultPromise;
            if (result.error) return new ErrorFlow(this.ctx, result.error);

            store.setSpinResult(result);

            // Race: animation vs skip
            await Promise.race([spinAnimation.finished, skipController.onSkip]);
            if (skipController.isSkipped) spinAnimation.complete();

            return new PresentationFlow(this.ctx, { result, quickStop: skipController.isSkipped || isQuick, isTurbo });
        } catch (error) {
            return new ErrorFlow(this.ctx, error);
        }
    }
}
```

## PresentationFlow

Runs presentation acts from server data. Extensible for free spins.

```js
class PresentationFlow extends BaseFlow {
    constructor(ctx, params) {
        super(ctx);
        this.params = params;
        this.skipController = this.createSkipController();
        if (ctx.autoplay.isActive() && ctx.autoplay.isTurboSpin) {
            this.skipController.skip();
        }
    }

    // Override in FreeSpinPresentationFlow for different acts
    getActMap() {
        return this.ctx.presentationActs;
    }

    async run() {
        const actMap = this.getActMap();

        // Build acts from server result order
        const acts = this.params.result.results
            .map(step => {
                const ActClass = actMap[step.type];
                return ActClass ? new ActClass(this.ctx, step) : null;
            })
            .filter(Boolean);

        const scenario = new AsyncActionsScenario(acts);

        // Wire skip
        if (!this.skipController.isSkipped) {
            this.skipController.onSkip.then(() => scenario.skipAllIfPossible());
        } else {
            scenario.skipAllIfPossible();
        }

        scenario.start();
        await scenario.onComplete;

        // Update autoplay
        if (this.ctx.autoplay.isActive()) {
            this.ctx.autoplay.next({ win: this.ctx.store.totalWin, loss: this.ctx.store.totalWin === 0 ? this.ctx.store.bet : 0 });
        }

        return this.routeNext();
    }

    // Override in FreeSpinPresentationFlow for different routing
    routeNext() {
        if (this.ctx.store.hasFreeSpins()) return new FreeSpinIntroFlow(this.ctx);
        return new IdleFlow(this.ctx);
    }
}
```

## Free Spins Flows

### FreeSpinIntroFlow
```js
class FreeSpinIntroFlow extends BaseFlow {
    async run() {
        const { hud, audio, store, background } = this.ctx;
        await hud.popups.showFreeSpinsIntro(store.freeSpinsCount);
        background.toFreeSpinsMode();
        audio.playMusic("freegame_loop", { loop: true });
        await hud.toFreeSpinsMode();
        return new FreeSpinIdleFlow(this.ctx);
    }
}
```

### FreeSpinIdleFlow
```js
class FreeSpinIdleFlow extends BaseFlow {
    async run() {
        this.ctx.hud.toFreeSpinIdleState();
        this.ctx.hud.display.setFreeSpinsCounter(this.ctx.store.freeSpinsLeft);
        await delay(500);
        return new FreeSpinningFlow(this.ctx);
    }
}
```

### FreeSpinningFlow
Same as SpinningFlow but calls `api.freeSpin()` instead of `api.spin(bet)` and decrements free spins counter. Routes to `FreeSpinPresentationFlow`.

### FreeSpinPresentationFlow
Extends PresentationFlow — overrides `getActMap()` to use `freeSpinPresentationActs` config and `routeNext()` to route to `FreeSpinIdleFlow` or `FreeSpinOutroFlow`.

### FreeSpinOutroFlow
```js
class FreeSpinOutroFlow extends BaseFlow {
    async run() {
        const { hud, audio, store, background } = this.ctx;
        await hud.popups.showFreeSpinsOutro(store.totalFreeSpinsWin);
        background.toBaseGameMode();
        audio.playMusic("basegame_loop", { loop: true });
        await hud.toMainGameMode();
        return new IdleFlow(this.ctx);
    }
}
```

## Utility Flows

### ErrorFlow
```js
class ErrorFlow extends BaseFlow {
    constructor(ctx, error) { super(ctx); this.error = error; }
    async run() {
        if (this.error.custom_message === "-1") {
            this.ctx.store.rejectBet();
            this.ctx.hud.display.setBalance(this.ctx.store.balance);
            return new IdleFlow(this.ctx);
        }
        await this.ctx.hud.popups.showError(this.error);
        return new IdleFlow(this.ctx);
    }
}
```

### InfoFlow / SettingsFlow
Simple popup flows: show popup, await close, return `new IdleFlow(this.ctx)`.

### BuyBonusFlow / AutoplaySettingsFlow
Show popup, if confirmed execute the action, return to idle.

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

Used in BaseFlow via `this.createSkipController()` which also wires HUD skip button and autoplay stop.

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
