# Project overview

This is engine for slot games

## Git Conventions

Never add Co-Authored-By lines to commit messages unless explicitly asked.

## Code Style & Architecture

Prefer simple, minimal architectures. Do not over-engineer solutions — start with the simplest approach that works for the specific use case before suggesting abstractions.

## Команды разработки

```bash
# run engine with game sandbox
npm run dev -- -game=sandbox

# build
npm run build
npm run build:prod

# release
npm run release

# export fonts / assets from Figma
npm run fonts
npm run export
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
│   │   ├── ActsRunner.js        # Запуск актов
│   │   ├── flow/                # Game flow система
│   │   │   ├── BaseFlow.js      # Базовый flow
│   │   │   ├── gameFlowLoop.js  # Игровой цикл
│   │   │   └── ControllerStore.js
│   │   ├── services/            # Сервисы (AudioManager, StateMachine, SceneManager...)
│   │   └── common/
│   │       ├── core/            # BaseContainer, ObjectFactory, EngineContext
│   │       ├── displayObjects/  # SpineAnimation, ScreenLayout, ComponentBuilder...
│   │       ├── layout/          # Layout система
│   │       ├── unified/         # Унифицированные Button, Slider
│   │       └── UI/              # Button, Slider, CheckBox...
│   └── slots/      # Логика слотов
│       ├── BaseGameState.js     # Базовый класс игровых состояний
│       ├── GameLogic.js         # API взаимодействие, управление спинами
│       ├── GameMath.js          # Преобразование данных спина в матрицы
│       ├── GameStates.js        # Константы состояний
│       ├── BetsController.js    # Управление ставками
│       ├── AutoplayController.js
│       ├── acts/                # Акты презентации (PaysAct, CascadeAct, StopReelsAct...)
│       ├── reels/               # Reels, Reel, ReelSymbol, ReelsScene
│       ├── components/          # Переиспользуемые UI компоненты слотов
│       ├── layoutControllers/   # SpinSpeedControlls, ValueSelector
│       └── animations/          # Анимации слотов
├── games/          # Проекты игр
│   ├── sandbox/    # Dev sandbox для тестирования
│   └── template/   # Шаблон новой игры
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
