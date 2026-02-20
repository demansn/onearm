---
name: engine-dev
description: "Skill for developing, improving, and refactoring the onearm slot engine core (modules/engine/ and modules/slots/). Use this skill whenever the user wants to modify engine internals, add new engine capabilities, refactor or simplify architecture, optimize performance, fix engine bugs, or understand how the engine works at a deep level. Trigger on any mention of: engine, architecture, refactor, improve, simplify, optimize, module, service, flow, act, runner, layout, component, display object, service locator, state machine, scene manager, audio manager, controller store, base container, object factory, engine context, screen layout, component builder, async action, acts runner, acts scenario, resize system, data model, game layers, resource loader, layout builder, layout system, reel strategy, symbol pool, cascade strategy, presentation act, reels scene. Also use when the user discusses engine patterns (Service Locator, Flow system, Acts/Scenarios, State Machine, Layout system, Component system, Strategy pattern) or wants to analyze dependencies between engine modules. Even if the user just says 'let's improve X' or 'simplify Y' where X/Y is an engine concept, use this skill."
---

# Engine Development Skill

You are an expert on the onearm slot engine. Before making ANY changes, you MUST deeply understand the affected code and its connections to the rest of the system.

**Always use ultrathink (extended thinking) for every task.** Engine changes can have cascading effects across the entire system — a seemingly small change to a base class or service can break every game. Take the time to think deeply before acting.

## Core Principles

1. **Understand before changing.** Read the relevant source files, trace imports/exports, and understand the call chain before proposing or making any modification. Never modify code you haven't read.

2. **Backward compatibility matters.** Games in `games/` depend on the engine's public API. Any change to exports from `modules/engine/index.js` or `modules/slots/index.js` must preserve the existing API surface or provide a clear migration path. Always check how `games/template/` and `games/sandbox/` use the code you're changing.

3. **Simplicity over abstraction.** The project values minimal, simple architectures. Don't introduce new abstractions unless they clearly reduce complexity. Three similar lines of code are better than a premature abstraction.

4. **Preserve patterns, don't fight them.** The engine has established patterns (Service Locator, Flows, Acts/Scenarios, Strategy for reels). Work within these patterns unless the user explicitly wants to change them.

5. **Incremental changes.** Make one logical change at a time. Verify each step works before proceeding to the next.

## Workflow

### Step 1: Research Phase

Before any modification:

1. Read the architecture reference: `references/architecture.md` in this skill's directory — it contains the full module map with exports, dependencies, and key methods for every engine file
2. Read the actual source files that will be affected
3. Trace the dependency chain:
   - What imports this module? (use Grep to search for import statements)
   - What does this module import?
   - Which services depend on it?
   - Which games use it?
4. Check `modules/engine/index.js` and `modules/slots/index.js` to understand what's part of the public API

### Step 2: Impact Analysis (ultrathink)

Use extended thinking to reason through:
- Which files will need to change?
- Will any public API signatures change?
- Could this break existing games in `games/`?
- What's the minimal change that achieves the goal?
- Are there edge cases with the Acts skip/guard logic, flow scope cleanup, or layout mode switching?

### Step 3: Implementation

- Make changes incrementally — one logical change at a time
- After changes, verify the build: `npm run build`
- Test with sandbox if appropriate: `npm run dev -- -game=sandbox`

### Step 4: Verification

- Build succeeds: `npm run build`
- Check that `games/template` still has valid imports
- If the change touches flows or acts, mentally trace the execution path to ensure correctness

## Tech Stack

- **PIXI.js 8.7** — 2D rendering (Container, Sprite, Text, Graphics, RenderLayer, Assets)
- **GSAP 3.13** — animations (Timeline, Tween, custom plugins for audio/spine)
- **Spine** (@esotericsoftware/spine-pixi-v8) — skeletal animations
- **ESBuild** — bundling (scripts/build.mjs)
- **typed-signals** — event system (Signal class with connect/disconnect)
- **ES Modules** — all code uses ESM imports/exports

## Architecture Overview

The full architecture reference with every module's exports, imports, key methods, and interconnections is in `references/architecture.md`. Read it before making changes. Here's a high-level summary:

### Module Structure
```
modules/engine/     — Core: Game, ServiceLocator, Flows, Acts, Services, Layout, Display
modules/slots/      — Slots: GameLogic, GameMath, Reels, Acts, States, Controllers
games/              — Game projects consuming the engine
```

### Key Patterns

**Service Locator** (`ServiceLocator.js`): Global service registry singleton. Services registered during `Game.start()` from `ServicesConfig`. Access via `services.get("name")` or dot notation `services.name`. All services available in flow context `ctx`.

**Flow System** (`flow/`): Modern async function chains. Each flow receives `(scope, ctx)`, returns next flow or null. Scope provides resource cleanup (`defer`), signal handling (`on`, `wait`), and child flows (`run`). The `gameFlowLoop` runs flows in sequence, disposing scope after each. Boot chain: `logo → preloader → main`.

**Acts/Scenarios** (`AsyncAction.js`, `ActsRunner.js`, `AsyncActionsScenario.js`): Sequential presentation steps with skip/guard logic. Each act has `action()` (returns Promise or GSAP timeline), `skip()`, and `guard` (boolean/function). ActsRunner advances through them sequentially, skipping acts whose guard returns false. `skipDisabled` prevents skipping, `skipStep` means "stop skipping here and run normally from this point".

**State Machine** (`services/stateMachine/`): Legacy FSM approach. States have `enter()`, `exit()`, `update()`. Supports nested FSMs, context injection from ServiceLocator, and signal auto-cleanup on exit.

**Layout System** (`LayoutSystem.js`, `LayoutBuilder.js`, `ScreenLayout.js`): JSON-driven UI construction from `components.config`. LayoutBuilder creates display object trees. ScreenLayout handles responsive mode switching (desktop/landscape/portrait). LayoutSystem auto-positions objects on resize based on `displayConfig`.

**Reels Strategy** (`reels/strategies/`): Pluggable animation strategies for reels. CascadeStrategy handles tumble/cascade animations. Strategy pattern allows different spin/stop/update behaviors per reel.

**Display Objects** (`common/core/`): BaseContainer (extends PIXI Container) with ObjectFactory integration, component system, tree queries (`find`, `get`, `findAll`, `forAll`). EngineContext singleton provides shared resources to all BaseContainers.

### Initialization Flow
```
Game.start(config)
  → ServicesConfig (ordered service initialization)
    → ServiceLocator registry
    → DataModel, ResourceLoader, RendererSystem, ResizeSystem...
    → LayoutSystem, LayoutBuilder, SceneManager
    → ControllerStore
    → EngineContext singleton
  → gameFlowLoop(ctx, firstFlow)
    → logo → preloader → main (game loop)
```

### Public API Surface
- `modules/engine/index.js` — Game, services, flows, scenes, layout, display objects, utilities
- `modules/slots/index.js` — GameLogic, GameMath, GameStates, BaseGameState, Reels, Acts, Controllers

## Common Tasks

### Adding a New Service
1. Create class extending `Service` in `modules/engine/services/`
2. Add to `ServicesConfig` in the correct init order (dependencies must init first)
3. Export from `modules/engine/index.js`
4. Available as `services.get("name")` and in flow `ctx`

### Adding a New Act
1. Create class extending `PresentationAct` in `modules/slots/acts/`
2. Implement `action()` (returns Promise or GSAP timeline), `skip()`, and optionally `guard`
3. Export from `modules/slots/index.js`
4. Games add it to their `AsyncActionsScenario` actions array

### Adding a New Reel Strategy
1. Create class extending `ReelAnimationStrategy` in `modules/slots/reels/strategies/`
2. Implement `start()`, `stop()`, `quickStop()`, `update()`, `destroy()`
3. Games assign: `reel.animationStrategy = new MyStrategy(reel)`

### Modifying the Flow System
1. Changes to `createScope.js` or `gameFlowLoop.js` affect ALL games
2. Test with both sandbox and template
3. Ensure scope cleanup (defer/dispose) still works correctly — resource leaks here are critical

### Refactoring a Service
1. Grep for all consumers of the service (import statements + `services.get("name")`)
2. Check `ServicesConfig` for init order dependencies
3. Preserve public API or provide migration path
4. Update `index.js` exports if needed
