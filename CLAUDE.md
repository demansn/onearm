# Project overview 

This is engine for slot games 

## Команды разработки

```bash
# run endigne with game sandbox
npm run dev -- -game=sandbox 
```

## Архитектура

### Структура модулей

```
onearm/
├── modules/
│   ├── engine/     # Core движок
│   │   ├── Game.js              # Главный класс инициализации
│   │   ├── ServiceLocator.js    # Паттерн Service Locator
│   │   ├── AsyncAction.js       # Обертка для асинхронных действий
│   │   ├── AsyncActionsScenario.js  # Управление последовательностью актов
│   │   ├── services/            # 22 сервиса (StateMachine, SceneManager, AudioManager...)
│   │   └── common/
│   │       ├── displayObjects/  # SuperContainer, SpineAnimation, FlexContainer...
│   │       └── UI/              # Button, Slider, CheckBox...
│   └── slots/      # Логика слотов
│       ├── BaseGameState.js     # Базовый класс игровых состояний
│       ├── GameLogic.js         # API взаимодействие, управление спинами
│       ├── GameMath.js          # Преобразование данных спина в матрицы
│       ├── GameStates.js        # Константы состояний
│       ├── BetsController.js    # Управление ставками
│       ├── AutoplayController.js
│       ├── acts/                # Система актов презентации
│       └── reels/               # Reels, Reel, ReelSymbol, ReelsMatrix
├── scripts/        # ESBuild сборка, экспорт Figma
└── static/         # HTML шаблон
```

## Технологии

- **PIXI.js 8.7** - 2D рендеринг
- **GSAP 3.13** - анимации
- **Spine** (@esotericsoftware/spine-pixi-v8) - скелетные анимации
- **ESBuild** - сборка
- **typed-signals** - событийная система
- **ES Modules** - формат модулей

Add under a ## Git Conventions section at the top level of CLAUDE.md\n\nNever add Co-Authored-By lines to commit messages unless explicitly asked.
Add under a ## Code Style & Architecture section in CLAUDE.md\n\nPrefer simple, minimal architectures. Do not over-engineer solutions — start with the simplest approach that works for the specific use case before suggesting abstractions.