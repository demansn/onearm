# Game Logic Reference

## Key Files

- `modules/slots/GameLogic.js` — API calls, balance, free spins management
- `modules/slots/GameMath.js` — converts server data to ReelsMatrix
- `modules/slots/GameStates.js` — state constants
- `modules/slots/BaseGameState.js` — base for FSM states
- `modules/slots/BetsController.js` — bet ladder management
- `modules/slots/AutoplayController.js` — autoplay settings

## GameLogic (Service)

Registered as `"gameLogic"` service. Manages API communication and game state:

```js
class GameLogic extends Service {
    // Initialization — loads player data
    async init() {
        const response = await this.api.player();
        this.balance = response.balance;
        this.bet = response.bet;
        this.freeSpins = response.freespins ? [response.freespins] : [];
        this.lastSpin = this.math.spinElementsToMatrix(response.lastSpin);
    }

    // Main spin — deducts bet optimistically, calls API
    async spin() {
        this.balance -= this.bet;
        const response = await this.api.spin({ bet: this.bet });
        this.checkError(response);
        this.checkUpdateBalance(response);     // reconcile after_balance
        this.checkFreeSpins(response);         // queue freespins
        return this.math.spinDataToResults(response);
    }

    // Free spin — no bet deduction
    async freeSpin() { /* same flow via api.freeSpin */ }

    // Buy feature
    async buyFreeSpins(betAmount, index) { ... }

    // Bet management
    async setBet(bet) { ... }

    // State queries
    hasFreeSpins()       // are free spins queued?
    getFreeSpinsLeft()   // count remaining
    nextFreeSpins()      // pop next free spin batch
    freeSpinsDone()      // mark batch complete
    canBet()             // balance >= bet?
    hasRestore()         // was there an interrupted spin?
}
```

## GameMath (Service)

Transforms server response data into engine-friendly format:

```js
class GameMath extends Service {
    spinDataToResults(spinData) {
        // Detects cascade vs standard format
        // Returns array of result steps:
        // { type: "stop", matrix: ReelsMatrix }
        // { type: "pays", pays: [...], totalWin: number }
        // { type: "symbols", freeSpinsAward: {...} }
        // { type: "freeSpinsWin", award: {...} }
    }

    reelsToMatrix(reels)                   // column-major → ReelsMatrix
    spinElementsToMatrix(spinElements)     // row-major string[][] → ReelsMatrix
    getSymbolData(symbolValue)             // handles {id, multiplier} objects
    generateReelsWithAllSymbols()          // debug: show all symbols
}
```

## GameStates Constants

```js
export const GameStates = {
    IDLE: "GameIdleState",
    SPINNING: "SPINNING",
    WINNING: "WINNING",
    RESTORE: "RESTORE",
    ERROR: "ERROR",
    FREE_SPIN_INTRO: "FREE_SPIN_INTRO",
    FREE_SPIN_OUTRO: "FREE_SPIN_OUTRO",
    FREE_SPIN_SPINNING: "FREE_SPIN_SPINNING",
    FREE_SPIN_WINNING: "FREE_SPIN_WINNING",
    FREE_SPIN_IDLE: "FREE_SPIN_IDLE",
    ShopState: "ShopState",
    InfoPageState: "InfoPageState",
};
```

## BaseGameState

Extends engine's `BaseState`, adds slots-specific context:

```js
class BaseGameState extends BaseState {
    constructor(parameters) {
        super(parameters);
        this.gameLogic = parameters.services.get("gameLogic");
        this.scenes    = parameters.services.get("scenes");
        this.data      = parameters.services.get("data");
        this.audio     = parameters.services.get("audio");
        this.keyboard  = parameters.services.get("keyboard");

        // Each state gets its own root container
        this.root = new BaseContainer();
        this.root.parentLayer = services.get("layers").get("default");
        app.root.addChild(this.root);
    }

    exit() {
        super.exit();        // disconnects all signals
        this.root.destroy(); // cleans up display tree
    }
}
```

Note: BaseGameState is for FSM-based games. Flow-based games (preferred) use `scope` for lifecycle management instead.

## BetsController

Manages bet ladder and current bet selection:

```js
class BetsController {
    constructor(bets, currentBet)
    getBet()           // current bet value
    setBet(value)      // set bet
    nextBet()          // increase bet
    prevBet()          // decrease bet
    getBets()          // full bet ladder array
    canIncrease()      // at max?
    canDecrease()      // at min?
    onChange           // typed-signal
}
```

## AutoplayController

Manages autoplay session state:

```js
class AutoplayController {
    start(count)       // begin autoplay for N spins
    stop()             // cancel autoplay
    tick()             // decrement remaining count
    isActive()         // currently autoplaying?
    getRemaining()     // spins left
    onChange           // typed-signal
}
```

## Typical Flow Integration

```js
async function slotLoop(scope, ctx) {
    const gameLogic = services.get("gameLogic");
    const bets = new BetsController(gameLogic.bets, gameLogic.bet);
    const autoplay = new AutoplayController();

    while (true) {
        // Idle: wait for spin button or autoplay
        const trigger = await scope.run(idle, ctx, bets, autoplay);

        if (trigger === "spin") {
            // Start visual spin + API call
            reelsScene.reels.startSpin();
            const result = await gameLogic.spin();

            // Presentation: stop reels, show wins, update balance
            await scope.run(presentation, ctx, result);

            // Autoplay tick
            if (autoplay.isActive()) {
                autoplay.tick();
                if (autoplay.getRemaining() <= 0) autoplay.stop();
            }
        }

        // Check free spins
        if (gameLogic.hasFreeSpins()) {
            await scope.run(freeSpinsFlow, ctx);
        }
    }
}
```
