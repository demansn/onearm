# {{GAME_NAME}}

Slot game built on the [onearm](https://github.com/demansn/onearm) engine.

## Команды

```bash
npm run dev        # Dev server
npm run build      # Build
npm run build:prod # Production build
npm run fonts      # Export fonts from Figma
npm run export     # Export assets from Figma
```

## Структура проекта

```
src/
├── Main.js              # Entry point — Game.start(GameConfig)
├── configs/
│   ├── GameConfig.js    # Game configuration (services, flow, scenes, layers)
│   └── resources-manifest.js  # PIXI asset bundles
├── flows/               # Async flow functions (logo → preloader → main → ...)
├── scenes/              # PIXI scenes (extend Scene from onearm)
└── states/              # Game states (if using FSM)
assets/
├── config.json          # Game metadata
└── ...                  # Sprites, spine, audio, fonts
```

## Архитектура

- **Flows** — async функции `(scope, ctx) => Promise`, чейнятся через `return nextFlow`
- **Scenes** — PIXI контейнеры, управляются через `ctx.scenes.show/remove`
- **scope.defer** — cleanup при выходе из flow
- **Services** — глобальный доступ через `services.get("name")`

## Технологии

PIXI.js 8, GSAP 3, Spine, ES Modules, typed-signals
