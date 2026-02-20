# Acts System Reference

The acts system sequences animated game events — stop reels, show wins, update counters, transition state.

## Key Files

- `modules/engine/AsyncAction.js` — wraps a single act
- `modules/engine/AsyncActionsScenario.js` — composes actions into scenario
- `modules/engine/ActsRunner.js` — drives acts through scenario
- `modules/slots/acts/PresentationAct.js` — base act class with GSAP timeline
- `modules/slots/acts/StopReelsAct.js` — stop reels at result positions
- `modules/slots/acts/PaysAct.js` — animate balance counter + win symbols
- `modules/slots/acts/GoToNextStateAct.js` — state transition
- `modules/slots/acts/CascadeAct.js` — cascade/tumble animation
- `modules/slots/acts/DestroySymbolsAct.js` — remove matched symbols
- `modules/slots/acts/MultiplierAct.js` — multiplier badge animation
- `modules/slots/acts/StickySymbolsAct.js` — sticky/held symbols
- `modules/slots/acts/SymbolsAnimationAct.js` — symbol-specific animations
- `modules/slots/acts/FreeSpinsPaysAct.js` — free spins win animation

## Three Layers

### AsyncAction

Wraps a single callback. Handles Promise, GSAP timeline, or sync return:

```js
class AsyncAction {
    constructor({ actionCallback, guard, skipCallback, skipDisabled, skipStep })
    apply()       // execute the action
    skip()        // fast-forward (kill + skipCallback)
    complete()    // emit onComplete signal
}
```

- `guard()` — return false to skip this action entirely
- `skipDisabled` — cannot be skipped by user tap
- `skipStep` — acts as a barrier: skipAll stops here

### ActsRunner

Iterates action list, respects guards, chains onComplete → toNext():

```js
class ActsRunner {
    toNext()              // advance to next action where guard() === true
    skipAllIfPossible()   // fast-forward, stops at skipStep/skipDisabled
}
```

### AsyncActionsScenario

Composes AsyncAction[] + ActsRunner:

```js
const scenario = new AsyncActionsScenario({
    actions: [act1, act2, act3]
});
scenario.start();               // begin first act
scenario.toNext();              // skip current, go to next
scenario.skipAllIfPossible();   // fast-forward all
scenario.onComplete             // signal: all acts done
```

## PresentationAct (Base Class)

All slot acts extend this:

```js
class PresentationAct {
    get timeline() {
        // lazy GSAP timeline: gsap.timeline({ id: `presentation-act-${this.constructor.name}` })
    }
    get guard() { return true; }   // override to conditionally skip
    action() {}                     // override: build and return GSAP timeline
    skip() {}                       // override: instant version for fast-forward
}
```

## Creating a Custom Act

```js
import { PresentationAct } from "onearm/slots";

class BigWinAct extends PresentationAct {
    constructor(data, reelsScene, hud) {
        super();
        this.data = data;
        this.reelsScene = reelsScene;
        this.hud = hud;
    }

    get guard() {
        return this.data.totalWin >= this.data.bet * 10;  // only for big wins
    }

    action() {
        const tl = this.timeline;

        // Animate win counter
        tl.to(this.hud, {
            winDisplay: this.data.totalWin,
            duration: 2,
            onUpdate: () => this.hud.updateWinText(),
        });

        // Play celebration spine animation
        const celebration = new SpineTimeline({ skeleton: "celebration" });
        tl.add(celebration.timeline({ animation: "play" }), "-=1");

        // Sound effects via AudioGsapPlugin
        tl.playSfx("big_win_fanfare", { loop: false });

        return tl;
    }

    skip() {
        this.hud.winDisplay = this.data.totalWin;
        this.hud.updateWinText();
    }
}
```

## Composing Acts into a Spin Scenario

```js
function createSpinScenario(result, reelsScene, hud) {
    const acts = [
        new StopReelsAct(result, reelsScene),
        new SymbolsAnimationAct(result, reelsScene),
        new PaysAct(result, reelsScene, hud),
        new BigWinAct(result, reelsScene, hud),
        new GoToNextStateAct(result),
    ];

    return new AsyncActionsScenario({
        actions: acts.map(act => new AsyncAction({
            actionCallback: () => act.action(),
            guard: () => act.guard,
            skipCallback: () => act.skip(),
        })),
    });
}
```

## Audio on Timelines

The AudioGsapPlugin registers methods directly on GSAP timelines:

```js
timeline.playSfx("counter_loop", { loop: true });
timeline.stopSfx("counter_loop");
timeline.playSfx("reel_stop");
```

This integrates sound effects naturally into the act timing without manual callbacks.
