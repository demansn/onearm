# Onearm Engine — Full Architecture Reference

## Table of Contents

1. [Entry Point & Bootstrap](#1-entry-point--bootstrap)
2. [Service Locator](#2-service-locator)
3. [Services Config](#3-services-config)
4. [Flow System](#4-flow-system)
5. [Acts / Scenarios](#5-acts--scenarios)
6. [State Machine](#6-state-machine)
7. [Scene Management](#7-scene-management)
8. [Layout System](#8-layout-system)
9. [Display Object Infrastructure](#9-display-object-infrastructure)
10. [Core Services](#10-core-services)
11. [Slots Module](#11-slots-module)
12. [Reels System](#12-reels-system)
13. [Presentation Acts](#13-presentation-acts)
14. [Games — Public API Surface](#14-games--public-api-surface)
15. [Dependency Flow Diagram](#15-dependency-flow-diagram)

---

## 1. Entry Point & Bootstrap

**`modules/engine/Game.js`**
- Exports: `Game` class
- Imports: `Ticker`, `StateMachine`, `gameFlowLoop`, `services`, `isClass`
- `static start(gameConfig)` — singleton guard, creates `new Game(gameConfig)`
- `init(gameConfig)` — iterates `gameConfig.services`, instantiates each service (class, function, or plain object), calls `service.init()` if present, registers in ServiceLocator
- Starts PIXI `Ticker` (low priority), calls `onTick()` every frame
- Execution model:
  - `gameConfig.flow` present → runs `gameFlowLoop(ctx, gameConfig.flow)` (modern)
  - `gameConfig.states` present → creates `StateMachine`, calls `fsm.goTo(gameConfig.initState)` (legacy)
- `onTick()` — propagates `step({dt})` to all services and root display tree, then `app.render()`

---

## 2. Service Locator

**`modules/engine/ServiceLocator.js`**
- Exports: `ServiceLocator` class + singleton `services` instance (also default export)
- `set(name, service)` — registers with name collision guard; also `this[name] = service` for dot-access
- `get(name)` — throws if not found
- `getAll()` — returns shallow copy of all services (used by gameFlowLoop to build `ctx`)
- The singleton `services` is the global registry shared by all engine code

---

## 3. Services Config

**`modules/engine/configs/services.config.js`**
- Exports: `ServicesConfig` — the default service wiring
- Init order (order matters — dependencies must init first):
  1. `gameConfig` — pass-through of config object
  2. `data` — `DataModel` (reactive key-value store, localStorage)
  3. `plugins` — `Plugins` (PIXI plugins)
  4. `resources` — `ResourceLoader` (PIXI Assets, bundle loading)
  5. `styles` — `Styles` (text style registry)
  6. `app` — `RendererSystem` (PIXI Application wrapper)
  7. `resizeSystem` — `ResizeSystem` (responsive scaling)
  8. `layoutSystem` — `LayoutSystem` (auto-positioning)
  9. `scenes` — `SceneManager`
  10. `currencyFormatter` — `CurrencyFormatter`
  11. `layers` — `GameLayers` (PIXI RenderLayer registry)
  12. `pixiGsap`, `spineGsap`, `audioGsap` — GSAP plugins
  13. `layouts` — `LayoutBuilder` (JSON component tree builder)
  14. `debugSystem`, `audio`, `keyboard`, `fullscreen`
  15. `controllerStore` — `ControllerStore`
  16. `superContainerInit` — initializes EngineContext singleton

---

## 4. Flow System

**`modules/engine/flow/createScope.js`**
- Creates scope: `on(signal, handler)`, `wait(signal)`, `defer(fn)`, `run(fn, ...args)`, `dispose()`
- Cleanups run LIFO on `dispose()`
- `scope.run()` creates child scope — cancel propagation works naturally

**`modules/engine/flow/gameFlowLoop.js`**
- `gameFlowLoop(ctx, flow)` — async loop: creates scope, awaits `flow(scope, ctx)`, disposes scope, repeats with returned next function
- Chain terminates when flow returns falsy

**`modules/engine/flow/BaseFlow.js`**
- Class-based alternative to plain async functions
- `execute()` calls `run()` in try/finally with `dispose()`
- `onDispose(cb)`, `connectSignal(signal, handler)`, `waitSignal(signal)`
- `awaitFlow(FlowClass, ...args)` — inline sub-flow execution
- Subclass implements `run()` returning next flow or null

**`modules/engine/flow/ControllerStore.js`** (extends `Service`)
- Registry for background reactive controllers (bet UI, autoplay state)
- `add(id, controller)`, `remove(id)`, `clear()` — with destroy() calls

---

## 5. Acts / Scenarios

**`modules/engine/AsyncAction.js`**
- Wraps a single "act": `action()`, `skip()`, `guard`, `skipDisabled`, `skipStep`
- `apply()` — calls `action()`, handles Promise or GSAP timeline return, fires `onComplete`
- `skip()` — kills animation, calls `skipCallback()`
- `isGuard()` — evaluates guard; if false, action skipped in ActsRunner
- `complete()` — idempotent, emits `onComplete` signal
- `kill()` — kills underlying GSAP timeline

**`modules/engine/ActsRunner.js`**
- Iterates `AsyncAction[]` sequentially
- `toNext()` — advances index, skips guarded actions, applies next
- `onAction` signal for current action, `onComplete` when all done
- `jumpTo(action)` — seeks forward
- `skipAllIfPossible()` — skips remaining respecting `skipDisabled` and `skipStep`
  - `skipStep=true` means "stop skipping here and run normally"

**`modules/engine/AsyncActionsScenario.js`**
- Composes `AsyncAction[]` + `ActsRunner` into reusable unit
- `start()`, `toNext()`, `jumpTo(action)`, `skipAllIfPossible()`

---

## 6. State Machine

**`modules/engine/services/stateMachine/StateMachine.js`**
- `goTo(name, parameters)` — exits current, lazy-creates target, calls `enter(parameters)`
- State config formats: class constructor, `{ Class, context }`, plain function
- Context injection: `{ scenes: "scenes" }` maps properties to service names

**`modules/engine/services/stateMachine/BaseState.js`**
- `enter()`, `exit()` (disconnects signals), `update(td)`
- `addSignalHandler(signal, handler)` — auto-connected/disconnected
- Nested FSM support: `goTo(name)`, `isCurrentState(name)`

---

## 7. Scene Management

**`modules/engine/services/sceneManager/SceneManager.js`** (extends `Service`)
- `add(sceneName, options)`, `show(sceneName, options)`, `hide(name)`, `remove(name)`, `get(name)`

**`modules/engine/services/sceneManager/Scene.js`** (extends `BaseContainer`)
- Constructor: `visible = false`, optional layer assignment
- Auto-builds layout if config exists for scene name
- `create(options)` — subclass hook
- `show()` / `hide()` — toggle visible
- `getPressSignal(query)` — button's onPress from layout
- `getObject(query)` — find by label

---

## 8. Layout System

**`modules/engine/services/LayoutSystem.js`** (extends `Service`)
- Listens to resize and root child events
- `_applyLayout(object, context)` — reads `displayConfig`, resolves zone, applies position/scale
- Values: numbers or strings ("50%", "100px")
- `updateObject(object)` — force re-apply

**`modules/engine/services/LayoutBuilder.js`** (extends `Service`)
- Reads `components.config` JSON
- `build(layout)` — top-level, applies current mode variant
- `buildLayout(config, properties)` — switch on `type`: ComponentContainer, AnimationButton, CheckBoxComponent, ValueSlider, DotsGroup, ProgressBar, ScrollBox, VariantsContainer, ZoneContainer
- `buildLayoutChildren(configs)` — recursive; `isInstance: true` looks up named config
- `buildScreenLayout(layout)` — creates ScreenLayout for multi-mode configs

**`modules/engine/common/displayObjects/ScreenLayout.js`** (extends `Container`)
- Eagerly builds ALL mode variants on construction
- `setMode(mode)` — shows active, hides previous, emits `onLayoutChange`
- `get(query)` / `find(query)` — search current layout
- `findAll(query)` / `forAll(query, fn)` — search all layouts

---

## 9. Display Object Infrastructure

**`modules/engine/common/core/EngineContext.js`**
- Container: `textures`, `styles`, `layers`, `assets`, `zone`, `data`, `rendererSize`
- Module-level singleton via `setEngineContext()` / `getEngineContext()`
- Set during `superContainerInit` service initialization

**`modules/engine/common/core/BaseContainer.js`** (extends PIXI `Container`)
- Constructor reads EngineContext, creates ObjectFactory
- `addObject(name, params)` / `createObject(name, properties)`
- `find(query)` / `get(query)` / `findAll(query)` / `forAll(query, fn)` — dot-notation tree search
- `setTint(colorHex)` / `restoreTint()`
- `step(event)` — propagates to components and children
- `components` array — composable behavior components

**`modules/engine/common/core/ObjectFactory.js`**
- Static registry: `objectsFactoriesByNames` map
- `registerObjectFactory(name, factory)` / `registerObjectConstructor(name, ctor)` / `registerObjectConstructors(map)`
- `buildDisplayObject(name, props)` — factory lookup, create, assign layer
- `createObject(name, props)` — build + displayConfig + layoutSystem.updateObject + add to parent
- Fallback chain: registered factory → Sprite → Text → texture lookup

---

## 10. Core Services

**`ResizeSystem`** — Modes: desktop (1920x1080), landscape (1920x1080 mobile), portrait (1080x1920). `getContext()` returns `{ mode, zone, screen, resolution, scale }`. `onResized` Signal. `step()` detects window changes.

**`AudioManager`** — Three tracks: SFX(0), MUSIC(1), AMBIENT(2). `playSfx/playMusic/playAmbient(name, params)`, `stopSfx/stopMusic/stopAmbient(name)`, `muteTrack(muted, trackId)`, `fadeMusic(volume, duration)`. GSAP plugin adds `timeline.playSfx()`.

**`DataModel`** — Reactive key-value store with `Object.defineProperty` setters. `onChangeValue(key)` returns per-key Signal. `onChangeAny(cb)`. Auto localStorage persistence.

**`GameLayers`** — Named PIXI `RenderLayer` instances from config. `get(name)` / `this[name]`.

**`ResourceLoader`** — Wraps PIXI `Assets` with bundle loading. `load(bundleName, { onLoaded, onProgress })`, `get(name)`.

---

## 11. Slots Module

**`modules/slots/GameStates.js`** — Constants: IDLE, SPINNING, WINNING, RESTORE, ERROR, FREE_SPIN_INTRO/OUTRO/SPINNING/WINNING/IDLE, ShopState, InfoPageState

**`modules/slots/BaseGameState.js`** (extends `BaseState`) — Resolves gameLogic, gameConfig, scenes, data, currencyFormatter, keyboard, audio from services. Creates `root` BaseContainer on default layer. `exit()` destroys root.

**`modules/slots/GameLogic.js`** (extends `Service`) — API abstraction. `init()` loads player state. `spin()` deducts bet, calls API, transforms via gameMath. `freeSpin()`, `buyFreeSpins()`, `setBet()`. Error handling with typed codes.

**`modules/slots/GameMath.js`** (extends `Service`) — `spinElementsToMatrix()`, `reelsToMatrix()`, `spinDataToResults()` (main transform: API → ordered results array of `{type, matrix, pays, ...}`), `cascadeSpinDataToResults()`. Types: "stop", "pays", "symbols", "freeSpinsWin", "pay", "destroy".

**`modules/slots/ReelsMatrix.js`** — 2D grid [row][column]. `fromSpinElements()`, `setCell/getCell`, `forEach`, `forEachColumn`, `findSymbols`, `fillByPosition`, `clone`, `placeSymbol/placeBigSymbol`.

**`modules/slots/BetsController.js`** (extends `Service`) — `betsLadder` array. Signals: `onBetChanged`, `onCoinValueChanged`, `onTotalBetChanged`. Navigation: `nextBet/previousBet`, `setBetMax`, `setBet`.

**`modules/slots/AutoplayController.js`** (extends `Service`) — `start({ gamesLimit, winLimit, lossLimit, turboSpin, quickSpin, skipScreen })`, `next()` checks limits, `stop()`, `isActive()`, `getGamesLeft()`.

---

## 12. Reels System

**`modules/slots/reels/ReelsScene.js`** (extends `Scene`) — Orchestrates reel display. `spin(type)`, `stop(result, force, spinType)`, `quickStop()`, `getWinAnimationTimeline(result)`, `playPayAnimation({positions, win})`, `skipWin(result)`.

**`modules/slots/reels/Reels.js`** (extends PIXI `Container`) — Creates `Reel` instances with CascadeStrategy. `spin(instant)` staggers by 0.1s per column. `stop(matrix, force, spinType)` staggers stop. `quickStop()`. `playWinAnimationsByPositions()`, `removeSymbolsByPositions()`, `replaceSymbols()`, `setStickySymbols()`.

**`modules/slots/reels/Reel.js`** (extends PIXI `Container`) — `animationStrategy` (pluggable, Strategy pattern). `startSpin/stop/quickStop/update` delegate to strategy. `createSymbol(data, row)` from SymbolPool. `replaceSymbols(matrix, onlyNewSymbols)`, `setStickySymbols(positions)`.

**`modules/slots/reels/ReelSymbol.js`** (extends `BaseContainer`) — bg sprite, frame sprite, spine animation, optional multiplier. `playWinAnimation()`, `playDropAnimation()`, `goToIdle()`, `reset(data)` (pool reset), `getMultiplierFlyAnimation()`, `playTriggerAnimation()`.

**Strategies:**
- `ReelAnimationStrategy.js` — abstract: `start()`, `stop()`, `quickStop()`, `update()`, `destroy()`
- `CascadeStrategy.js` — `start(instant)` animates symbols falling off, `stop(matrix)` calls `fillFromTop()`, `quickStop()`, `forceStop()`

---

## 13. Presentation Acts

**`PresentationAct.js`** — Base: lazy `timeline` getter (GSAP), `guard` (true), empty `action()`/`skip()`, `skipStep=true`

**`StopReelsAct.js`** — `action()` calls reelsScene.quickStop() or stop(). `skip()` force-stops.

**`PaysAct.js`** — `action()` → sequential pays via GSAP timeline. Win counter, pay text, symbol removal. `skip()` instantly sets balance/win.

**`CascadeAct.js`** — `action()` calls CascadeAnimation.build(). `skip()` goToIdle.

**Other acts:** DestroySymbolsAct, FreeSpinsPaysAct, GoToNextStateAct, GoToNextStateAfterFreeSpinAct, MultiplierAct, StickySymbolsAct, SymbolsAnimationAct.

---

## 14. Games — Public API Surface

**Sandbox (`games/sandbox/src/Main.js`)**:
```js
import { Game, ServicesConfig } from "../../../modules/engine/index.js";
Game.start({ services: ServicesConfig, flow: sandbox, resources: { manifest }, layers: { layers: ["default"] }, styles: {} });
```

**Template (`games/template/src/Main.js`)**:
```js
import { Game } from "onearm";
import { GameConfig } from "./configs/GameConfig.js";
Game.start(GameConfig);
```

**GameConfig pattern:**
```js
export const GameConfig = {
    services: ServicesConfig,
    flow: logo,               // entry flow function
    resources: { manifest },
    layers: { layers: ["background", "main", "ui"] },
    scenes: { PreloaderScene, HUDScene },
    styles: {},
};
```

**Boot chain:** `logo → preloader → main` (each loads a bundle, returns next flow)

**Scene pattern:**
```js
export class HUDScene extends Scene {
    create() { /* build display objects */ }
}
```

---

## 15. Dependency Flow Diagram

```
Game.start(config)
  │
  ├── ServicesConfig (ordered service initialization)
  │     ├── gameConfig (raw config pass-through)
  │     ├── data (DataModel → localStorage)
  │     ├── plugins (PIXI plugins)
  │     ├── resources (ResourceLoader → PIXI Assets)
  │     ├── styles (text style registry)
  │     ├── app (RendererSystem → PIXI Application)
  │     ├── resizeSystem (responsive scaling → onResized signal)
  │     ├── layoutSystem (auto-positioning ← resizeSystem)
  │     ├── scenes (SceneManager)
  │     ├── currencyFormatter
  │     ├── layers (GameLayers → RenderLayer instances)
  │     ├── GSAP plugins (pixiGsap, spineGsap, audioGsap)
  │     ├── layouts (LayoutBuilder ← components.config)
  │     ├── debugSystem, audio, keyboard, fullscreen
  │     ├── controllerStore (ControllerStore)
  │     └── superContainerInit → EngineContext singleton
  │
  ├── Ticker (frame loop → onTick → step + render)
  │
  └── gameFlowLoop(ctx, firstFlow)
        │
        └── flow chain: logo → preloader → main
              │
              └── Scenes + Acts + Reels (presentation layer)
                    │
                    ├── AsyncActionsScenario → ActsRunner → AsyncAction[]
                    │     ├── StopReelsAct
                    │     ├── PaysAct
                    │     ├── CascadeAct
                    │     └── ...
                    │
                    ├── ReelsScene → Reels → Reel[] → ReelSymbol[]
                    │     └── animationStrategy (CascadeStrategy / custom)
                    │
                    └── GameLogic → API → GameMath → ReelsMatrix
```
