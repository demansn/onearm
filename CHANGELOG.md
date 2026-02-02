# Changelog

All notable changes to Onearm will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.1.0]: https://github.com/demansn/onearm/releases/tag/v0.1.0
