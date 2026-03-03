# Skill Quality Guide & Map

## Skills Map

This is the complete map of all project skills and what engine content they document. Use this to know exactly where to look when engine APIs change.

### game-dev
**Purpose:** Help create slot games on the engine.
**Files:**
| File | Documents | Engine dependencies |
|------|-----------|-------------------|
| `SKILL.md` | Workflow for creating games, architecture overview, flow/scope patterns, scene creation, act composition | `Game.start()`, `ServicesConfig`, `ctx.serviceName` in flows, `this.services` in Scene, flow `scope` API, `Scene` class, `PresentationAct` class, import paths from `"onearm"` and `"onearm/slots"` |
| `references/acts-system.md` | AsyncAction, ActsRunner, AsyncActionsScenario APIs, custom act examples | `AsyncAction` constructor params, `ActsRunner.toNext/skipAllIfPossible`, `AsyncActionsScenario.start`, `PresentationAct` base class, GSAP timeline integration |
| `references/game-logic.md` | GameLogic, GameMath, GameStates, BaseGameState, BetsController, AutoplayController | Service method signatures (`spin()`, `freeSpin()`, `setBet()`), `GameStates` constants, `BaseGameState` constructor (service injection), `BetsController` signals, `AutoplayController.start()` params |
| `references/reels-system.md` | Reels, Reel, ReelSymbol, SymbolPool, strategies, ReelsMatrix | `ReelsScene` methods, `Reel.animationStrategy`, `CascadeStrategy`/`SpinStrategy` APIs, `ReelSymbol` animation methods, `ReelsMatrix` data structure, `SymbolPool` singleton |

### engine-dev
**Purpose:** Modify/improve the engine itself.
**Files:**
| File | Documents | Engine dependencies |
|------|-----------|-------------------|
| `SKILL.md` | Workflow, core principles, architecture overview, common tasks | All key patterns (Service Locator, Flows, Acts, FSM, Layout, Reels Strategy), tech stack versions, build commands, public API surface |
| `references/architecture.md` | Complete module reference — every service, class, method, dependency chain | **Everything.** This is the most detailed file. All 16 services from ServicesConfig, all flow/scope methods, all act/runner APIs, all state machine methods, all scene/layout/display APIs, all slots module classes, all reel system classes, full dependency diagram |

### scene-layout
**Purpose:** Create scenes, build layouts, responsive UI.
**Files:**
| File | Documents | Engine dependencies |
|------|-----------|-------------------|
| `SKILL.md` | Scene creation, Layout modes (auto/manual), ScreenLayout, zone-based positioning, components.config format, ObjectFactory, resize handling, common patterns | `Scene` class, `SceneManager` API, `Layout` class (mode/flow/gap/wrap/contentAlign/spaceBetween), `ScreenLayout` API (setMode/get/findAll/forAll), `LayoutSystem` (displayConfig/zones), `LayoutBuilder` (build/buildScreenLayout/getConfig), `ZoneContainer`/`FullScreenZone`/`SaveZone`, `ObjectFactory` (registerObjectConstructor/registerObjectFactory), `BaseContainer` tree search (find/findAll/forAll), `ResizeSystem` (getContext/onResized/modes), `GameLayers` |
| `references/layout-api.md` | Full API reference for Layout, ScreenLayout, LayoutSystem, LayoutBuilder, ZoneContainer, ObjectFactory, BaseContainer, Scene, ResizeSystem, GameLayers | All scene/layout/display classes method signatures, displayConfig property format, zone structure, component types supported by LayoutBuilder |

### flow-dev
**Purpose:** Create correct game flows.
**Files:**
| File | Documents | Engine dependencies |
|------|-----------|-------------------|
| `SKILL.md` | Functional flow style, scope API, ctx object, boot chain, slot game loop patterns, common patterns | `gameFlowLoop`, `createScope`, scope methods (`defer`, `on`, `wait`, `run`), `ctx` service keys, `AsyncActionsScenario`, `delay()` |
| `references/slot-flows.md` | Complete slot flow reference: idle, spinning, presentation, freeSpins, error flows, skip controller, acts integration | `createSkipController()`, `AsyncActionsScenario` API, `presentationActs` config pattern, HUD/Reels/API/Store/Audio/Autoplay interfaces |

### behavior-dev
**Purpose:** Create components with auto-attached behaviors (Figma → export → GameConfig → Behavior class).
**Files:**
| File | Documents | Engine dependencies |
|------|-----------|-------------------|
| `SKILL.md` | Workflow for creating behaviors, Figma component structure guide, common patterns (tabs, accordion, toggle), checklist | `LayoutController` (constructor, init, find, connectSignal, getState/setState, destroy), `BaseContainer._behavior`/`.behavior`, `LayoutBuilder.#attachBehavior`, `ScreenLayout` state sync, `Scene.findBehavior()`, `GameConfig.behaviors` format |
| `references/behavior-api.md` | Full API reference: LayoutController API, attachment flow, GameConfig format, state sync mechanism, access patterns, Figma structure guide, export pipeline | All LayoutController methods, LayoutBuilder behavior attachment internals, ScreenLayout `#collectBehaviors`, key matching rules (name vs type), Figma naming conventions |

### commit
**Purpose:** Git commit workflow.
**Files:** `SKILL.md` only.
**Engine dependencies:** None (general git workflow). Safe to skip during sync.

### release
**Purpose:** Version bump, changelog, tag.
**Files:** `SKILL.md` only.
**Engine dependencies:** Minimal — GitHub URL, file paths (CHANGELOG.md, MIGRATION.md, package.json). Only update if repo structure changes.

---

## Quality Checklist

After updating any skill file, verify:

- [ ] **Size limits respected** — SKILL.md < 500 lines, reference files < 300 lines
- [ ] **Code examples are valid** — every import path, class name, method call, and parameter matches current engine source
- [ ] **No stale references** — removed APIs/methods are removed from docs, not commented out
- [ ] **No duplication** — SKILL.md and reference files don't repeat the same information
- [ ] **Style preserved** — formatting, language (Russian/English mix), header hierarchy, code block labels match the original
- [ ] **Public API surface accurate** — exports listed in skills match `modules/engine/index.js` and `modules/slots/index.js`
- [ ] **Service access correct** — all service access uses proper patterns: `ctx.name` in flows, `this.services.get("name")` in Scene, `getEngineContext().services.get("name")` in engine internals. No imports of singleton `services`
- [ ] **Constructor params current** — base class constructors (Scene, PresentationAct, BaseGameState, ReelAnimationStrategy) match source

## Priority Order for Updates

When time is limited, update in this order (highest impact first):

1. **engine-dev/references/architecture.md** — most detailed, most likely to drift
2. **game-dev/references/** — acts-system.md, game-logic.md, reels-system.md
3. **scene-layout/references/layout-api.md** — Layout, ScreenLayout, LayoutBuilder APIs
4. **game-dev/SKILL.md** — import examples, service access patterns
5. **scene-layout/SKILL.md** — scene/layout patterns, components.config format
6. **flow-dev/references/slot-flows.md** — slot flow class APIs
7. **flow-dev/SKILL.md** — scope API, ctx keys, boot chain
8. **engine-dev/SKILL.md** — architecture overview section
9. **release/SKILL.md** — only if repo structure changed
