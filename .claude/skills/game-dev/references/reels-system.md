# Reels System Reference

## Architecture

```
ReelsScene (Scene/BaseContainer)
  └── Reels (PIXI Container)
        └── Reel[] (one per column)
              └── ReelSymbol[] (BaseContainer)
                    ├── content (BaseContainer, centered)
                    │     ├── symbolBg (Sprite, optional)
                    │     ├── symbolFrame (Sprite, optional)
                    │     └── spine (SpineTimeline) OR static sprite
                    └── multiplier (SymbolMultiplier, optional)
```

## Key Files

- `modules/slots/reels/Reels.js` — container of all Reel columns
- `modules/slots/reels/Reel.js` — single column, uses strategy pattern
- `modules/slots/reels/ReelSymbol.js` — individual symbol display object
- `modules/slots/reels/ReelsScene.js` — scene wrapping Reels + layout
- `modules/slots/reels/ReelsSymbols.js` — weighted random symbol generator
- `modules/slots/reels/strategies/SpinStrategy.js` — traditional spin
- `modules/slots/reels/strategies/CascadeStrategy.js` — cascade/tumble drop
- `modules/slots/ReelsMatrix.js` — 2D symbol grid data structure
- `modules/slots/SymbolPool.js` — singleton pool for reusing symbols

## ReelsSymbols — Weighted Random Generator

```js
class ReelsSymbols {
    constructor(symbols) {
        // builds cumulativeWeights[] from symbol.weight
    }
    next()            // returns random symbol config based on weights
    getByID(id)       // lookup by numeric id
    getByName(name)   // lookup by string name
}
```

## Reel — Strategy Pattern

```js
class Reel extends Container {
    constructor(data) {
        this.animationStrategy = new AnimationStrategy(this);
    }
    startSpin(instant)                    // begin spin
    stop(matrix, force, spinType)         // stop at matrix positions
    quickStop(matrix, delay, spinType)    // fast stop
    update(dt)                            // per-frame update
}
```

## Animation Strategies

### CascadeStrategy (default)
- `start()` — symbols fall off-screen (power1.in), removed from pool
- `stop(matrix)` — `fillFromTop()` creates new symbols above, tweens to final y (power1.in)
- `quickStop(matrix)` — parallel drop, 0.02s delay between symbols (power2.in)
- `forceStop(matrix)` — kills tweens, instant `replaceSymbols()`

### SpinStrategy
- Traditional slot machine spin — symbols scroll vertically
- Configurable spin speed, bounce, anticipation

## ReelSymbol

```js
class ReelSymbol extends BaseContainer {
    playWinAnimation(skip = false)    // spine "out" + effect overlay → gsap.timeline
    gotToIdle()                       // reset scale/alpha, spine to idle
    getMultiplierFlyAnimation(pos)    // fly multiplier badge to HUD
}
```

## SymbolPool (Singleton)

Avoids destroying/recreating Spine animations:
```js
SymbolPool.getSymbol(name, createFn)    // get from pool or create
SymbolPool.returnSymbol(symbol)         // return to pool (max 5 per type)
```

## ReelsMatrix — 2D Symbol Grid

```js
ReelsMatrix.fromSpinElements(spinElements, symbols)  // server data → matrix
ReelsMatrix.fromJSON(string)

matrix.setCell(row, column, data)
matrix.getCell(row, column)
matrix.forEach(callback)
matrix.forEachColumn(column, callback)
matrix.findSymbols(name)              // returns [{row, column}]
matrix.getSymbolsCount(name)
matrix.placeBigSymbol(...)            // multi-cell symbol
matrix.clone()
```

## ReelsScene

Scene that wraps Reels with layout support:
```js
class ReelsScene extends Scene {
    create() {
        this.reels = new Reels(reelsConfig);
        this.addChild(this.reels);
    }
    stop(result, instant, spinType)      // delegates to reels
    playPayAnimation(pays)               // highlight winning symbols
}
```
