# Changelog

All notable changes to Onearm will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.0] - 2026-03-08

### Added
- DOMText component — DOM-based selectable/copyable text rendered over canvas via postrender runner
- ScrollBar component — draggable scrollbar with vertical/horizontal support and typed-signals API
- Figma export: rotation exported as `angle` (degrees) with PIXI coordinate correction for pivot(0,0)
- ScreenLayout device filtering — desktop gets only "default"/"desktop" variants, mobile only "portrait"/"landscape"

### Changed
- Figma export: `rotation` (radians) field replaced by `angle` (degrees) in exported config
- LayoutBuilder: added `angle` to `applyProperties` whitelist
- Refactor rotation helpers into `coordinateUtils.ts` (`correctRotatedPosition`, `getUnrotatedDimensions`)

## [0.7.0] - 2026-03-04

### Added
- Behavior system — auto-attach LayoutController subclasses to components via `GameConfig.behaviors`
- RadioGroupBehavior and TabsBehavior as built-in engine behaviors
- Async flow primitives: `delay`, `waitForSignal`, `waitForAny`, `waitUntil`
- ESLint, Prettier, GSDevTools production strip, bundle size tracking
- Gameplay Cues design document

### Changed
- Remove services singleton — consolidate DI through EngineContext and constructor injection
- Remove LayoutSystem service — replace with `applyDisplayProperties` utility
- Replace boolean `instant` param with string `spinType` across reel spin chain

### Fixed
- Use `node_modules` check instead of path check for onearm alias resolution
- Fix API typos, remove dead code, window globals, and plain object throws
- Fix 4 slots bugs: sprite typo, turbo set target, off-by-one, debugger statement

## [0.6.0] - 2026-03-02

### Added
- Declarative child scenes — вложение сцен через конфиг `children` с авто-reparenting при смене variant'а
- Figma component export pipeline — миграция из figma-pixi-layouts
- Generic builder + unified style format для layout system
- Compute instance scale relative to original component в Figma export
- Component type registry для упрощения добавления новых компонентов
- Debug logging для невалидных image объектов в Button

### Changed
- Unify layout systems — удалены AlignLayout, BlockAlignment; DOPS объединён в LayoutSystem (`applyProperties`)
- Simplify ResizeSystem — unified update flow, CSS strategies per environment, throttled 16ms
- Simplify engine — удалён dead code, replace resize polling
- Flat output для single-variant компонентов, удалены VariantsContainer/TextBlock
- Generalize shared deps resolution, добавлен Button factory

### Fixed
- Preserve original case in component variant keys during export
- Check variantProperties before parent guard in extractVariantProps
- Resolve empty build for component set variants in LayoutBuilder
- Restore Button image view in generic buildComponent

## [0.5.6] - 2026-02-22

### Added
- Scene-layout skill для создания сцен и адаптивных layout'ов
- Поддержка типа "Button" как алиаса для "AnimationButton" в LayoutBuilder

### Changed
- Game-dev skill: делегирование scene/layout задач в scene-layout skill
- Обновлён skill-quality-guide с информацией о scene-layout skill

## [0.5.5] - 2026-02-21

### Fixed
- Move esbuild to dependencies so game projects can build without installing it separately

## [0.5.4] - 2026-02-21

### Changed
- Rewrite Figma tools as unified TypeScript CLI (`onearm-figma`)
- Consolidate `onearm-export`, `onearm-fonts`, `onearm-oauth-figma` into single binary with subcommands
- Migrate `export-fonts` and `export-components` from FIGMA_TOKEN to OAuth
- Migrate `export-components` from CommonJS to ESM

### Fixed
- Use correct Figma OAuth scope (`file_content:read`)
- Replace deprecated `url.parse()` with WHATWG URL API

## [0.5.3] - 2026-02-21

### Added
- `onearm-oauth-figma` bin with subcommands (`setup`, `check`)
- Engine-dev, flow-dev, and skills-sync Claude Code skills

### Changed
- Renamed `onearm-oauth` → `onearm-oauth-figma`
- Renamed npm scripts `setup-oauth`/`check-oauth` → `oauth`/`oauth:check`
- Updated all OAuth error messages to reference `npx onearm-oauth-figma`

## [0.5.2] - 2026-02-20

### Added
- CLAUDE.md template and .claude/skills copy during `onearm-init`
- Game-dev skill for Claude Code

### Changed
- Updated CLAUDE.md with complete project structure and commands
- Added commit/release skill frontmatter

## [0.5.1] - 2026-02-20

### Fixed
- Resolve gsap alias from game project's node_modules first

### Changed
- Unify engine architecture — BaseContainer, ObjectFactory, Layout, Button, Slider

## [0.4.2] - 2026-02-20

### Added
- Make `show` method in SceneManager asynchronous
- Introduce AudioGsapPlugin and remove SavedData service

## [0.4.1] - 2026-02-19

### Changed
- Remove unused dependencies, migrate signals to typed-signals

## [0.4.0] - 2026-02-19

### Added
- Game template and `onearm-init` CLI
- Scene architecture documentation and BaseFlow class

## [0.3.0] - 2026-02-19

### Changed
- Migrate engine from PixiJS v7 to v8
- Replace class-based flow system with plain functions + scope (createScope)

### Added
- `awaitFlow` method to BaseFlow for inline sub-flow execution
- `connectSignal` method to BaseFlow for signal management
- `waitSignal` method to BaseFlow for signal handling

## [0.2.0] - 2026-02-11

### Added
- Game flow with Presentation Acts system

### Changed
- Refactor game state management to use flows

## [0.1.3] - 2026-02-02

### Fixed
- npm link workflow now fully functional
- Game root detection via symlink realpath checking
- Automatic discovery of game project when onearm is linked

### Changed
- Removed hardcoded GAME_ROOT from package.json scripts
- Enhanced findGameRoot to search sibling directories for symlinked projects

## [0.1.2] - 2026-02-02

### Fixed
- Game root detection now properly works when run from node_modules/onearm
- Fixed all esbuild scripts to use correct game root paths
- Fixed static file paths (CSS, HTML) in build scripts
- Added default export for services in main index.js

### Added
- Export for `onearm/components/*` to access slots components directly

### Changed
- All build scripts now use inline HTML template processing
- Improved findGameRoot logic with package.json dependency check

## [0.1.1] - 2026-02-02

### Fixed
- Game root detection for proper .env file resolution
- Asset export paths now correctly resolve to game project root
- Fixed export-fonts.js and export.js to work from node_modules

### Added
- `find-game-root.js` utility to automatically detect game project root
- npx support with bin scripts:
  - `npx onearm-fonts` - Export fonts from Figma
  - `npx onearm-export` - Export assets from Figma
  - `npx onearm-oauth` - Setup OAuth for Figma

### Changed
- Scripts now use game root instead of relative paths for .env and output directories

## [0.1.0] - 2026-02-02

### Added

#### Engine Module
- Core game engine with PIXI.js 7.4.2 integration
- Service Locator pattern for dependency injection
- State Machine for game flow management
- Scene Management system
- Component system with responsive layouts
- Audio Manager with sound effects and music support
- Resource Loader with asset management
- Resize System for responsive UI
- Debug System for development
- Fullscreen Service
- Keyboard Service
- Layout System with AutoLayout, FlexContainer, ZoneContainer
- UI Components: Button, AnimationButton, CheckBox, Slider, DotsGroup, MoneyBar
- Display Objects: SuperContainer, SpineAnimation, SpineTimeline, TextBlock
- Spine animation support (@esotericsoftware/spine-pixi-v7)
- GSAP 3.13 animation library integration
- Figma integration with OAuth 2.0 authentication
- Asset export tools

#### Slots Module
- Base Game State with state machine integration
- Game Logic and Game Math services
- Bets Controller for bet management
- Autoplay Controller
- Reels system with animation strategies (Spin, Cascade)
- Symbol pool and reel symbols management
- Acts system for presentation logic:
  - StopReelsAct
  - PaysAct
  - CascadeAct
  - MultiplierAct
  - DestroySymbolsAct
  - StickySymbolsAct
  - FreeSpinsPaysAct
  - GoToNextStateAct
- Cascade animations
- Reels Scene with flexible rendering
- Game States management

#### Build System
- ESBuild configuration for fast builds
- Development server with hot reload
- Production builds with minification
- Asset copying and HTML template processing
- Support for game root auto-detection

#### Documentation
- README.md with installation and usage instructions
- DEVELOPMENT.md with workflow guide
- ARCHITECTURE_FLOW_CONTROLLERS.md with architecture documentation

### Technical Details
- ES Modules support
- Modular architecture with engine and slots modules
- Flexible exports: main bundle and separate modules
- npm link support for local development
- Git package installation support

### Dependencies
- PIXI.js ^7.4.2
- GSAP ^3.13.0
- @esotericsoftware/spine-pixi-v7 ^4.2.71
- @pixi/sound ^5.2.3
- @pixi/ui ^1.2.4
- typed-signals ^3.0.0
- And more (see package.json)

[0.7.0]: https://github.com/demansn/onearm/releases/tag/v0.7.0
[0.6.0]: https://github.com/demansn/onearm/releases/tag/v0.6.0
[0.5.6]: https://github.com/demansn/onearm/releases/tag/v0.5.6
[0.5.5]: https://github.com/demansn/onearm/releases/tag/v0.5.5
[0.5.4]: https://github.com/demansn/onearm/releases/tag/v0.5.4
[0.5.3]: https://github.com/demansn/onearm/releases/tag/v0.5.3
[0.5.2]: https://github.com/demansn/onearm/releases/tag/v0.5.2
[0.8.0]: https://github.com/demansn/onearm/releases/tag/v0.8.0
[0.5.1]: https://github.com/demansn/onearm/releases/tag/v0.5.1
[0.4.2]: https://github.com/demansn/onearm/releases/tag/v0.4.2
[0.4.1]: https://github.com/demansn/onearm/releases/tag/v0.4.1
[0.4.0]: https://github.com/demansn/onearm/releases/tag/v0.4.0
[0.3.0]: https://github.com/demansn/onearm/releases/tag/v0.3.0
[0.2.0]: https://github.com/demansn/onearm/releases/tag/v0.2.0
[0.1.3]: https://github.com/demansn/onearm/releases/tag/v0.1.3
[0.1.2]: https://github.com/demansn/onearm/releases/tag/v0.1.2
[0.1.1]: https://github.com/demansn/onearm/releases/tag/v0.1.1
[0.1.0]: https://github.com/demansn/onearm/releases/tag/v0.1.0
