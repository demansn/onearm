# Changelog

All notable changes to Onearm will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.5.2]: https://github.com/demansn/onearm/releases/tag/v0.5.2
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
