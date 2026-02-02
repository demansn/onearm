# Onearm Slot Game Engine

Modern slot game engine built with PIXI.js, GSAP, and Spine animations.

## Installation

### As npm git package

```bash
npm install git+ssh://git@github.com:demansn/onearm.git
```

Or add to your `package.json`:

```json
{
  "dependencies": {
    "onearm": "git+ssh://git@github.com:demansn/onearm.git#main"
  }
}
```

### For development (with npm link)

```bash
# Clone the repository
git clone git@github.com:demansn/onearm.git
cd onearm
npm install

# Create global symlink
npm link

# In your game project
cd /path/to/your/game
npm link onearm
```

## Usage

```javascript
import { Game, Scene, SuperContainer, BaseGameState } from 'onearm';

// Or import from specific modules
import { Scene } from 'onearm/engine';
import { BaseGameState } from 'onearm/slots';
```

## Development Commands

```bash
npm run build       # Development build
npm run build:prod  # Production build with minification
npm run serve       # Start dev server with hot reload
npm run dev         # Alias for serve
```

## Structure

- `modules/engine/` - Core engine (PIXI.js, services, UI components)
- `modules/slots/` - Slot game logic (reels, acts, game states)
- `scripts/` - Build and asset export scripts
- `static/` - HTML template and CSS

## Features

- **Service Locator** pattern for dependency injection
- **State Machine** for game flow management
- **Scene Management** for UI screens
- **Component System** with responsive layouts
- **Asset Management** with Figma integration
- **Audio System** with sound effects and music
- **Spine Animation** support

## License

ISC
