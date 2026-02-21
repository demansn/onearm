# Skill Quality Guide & Map

## Skills Map

This is the complete map of all project skills and what engine content they document. Use this to know exactly where to look when engine APIs change.

### game-dev
**Purpose:** Help create slot games on the engine.
**Files:**
| File | Documents | Engine dependencies |
|------|-----------|-------------------|
| `SKILL.md` | Workflow for creating games, architecture overview, flow/scope patterns, scene creation, act composition | `Game.start()`, `ServicesConfig`, `services.get()`, flow `scope` API, `Scene` class, `PresentationAct` class, import paths from `"onearm"` and `"onearm/slots"` |
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

### flow-dev
**Purpose:** Create correct game flows.
**Files:**
| File | Documents | Engine dependencies |
|------|-----------|-------------------|
| `SKILL.md` | Two flow styles (functional + class-based), scope API, ctx object, boot chain, slot game loop patterns, common patterns | `gameFlowLoop`, `createScope`, `BaseFlow`, scope methods (`defer`, `on`, `wait`, `run`), `ctx` service keys, `AsyncActionsScenario`, `delay()` |
| `references/slot-flows.md` | Complete slot flow reference: IdleFlow, SpinningFlow, PresentationFlow, FreeSpins*, ErrorFlow, BuyBonusFlow, skip controller, acts integration | All BaseFlow methods, `createSkipController()`, `AsyncActionsScenario` API, `presentationActs` config pattern, HUD/Reels/API/Store/Audio/Autoplay interfaces from `gameFlow.ts` |

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
- [ ] **Service names correct** — all `services.get("name")` calls use names from current `ServicesConfig`
- [ ] **Constructor params current** — base class constructors (Scene, PresentationAct, BaseGameState, ReelAnimationStrategy) match source

## Priority Order for Updates

When time is limited, update in this order (highest impact first):

1. **engine-dev/references/architecture.md** — most detailed, most likely to drift
2. **game-dev/references/** — acts-system.md, game-logic.md, reels-system.md
3. **game-dev/SKILL.md** — import examples, service access patterns
4. **flow-dev/references/slot-flows.md** — slot flow class APIs
5. **flow-dev/SKILL.md** — scope API, ctx keys, boot chain
6. **engine-dev/SKILL.md** — architecture overview section
7. **release/SKILL.md** — only if repo structure changed
