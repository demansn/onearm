# Project overview

This is engine for slot games

## Git Conventions

Never add Co-Authored-By lines to commit messages unless explicitly asked.

## Code Style & Architecture

Prefer simple, minimal architectures. Do not over-engineer solutions — start with the simplest approach that works for the specific use case before suggesting abstractions.

- **Signals**: Всегда используй `Signal` из `typed-signals` для событий в behaviors (LayoutController subclasses). Не используй EventEmitter / PIXI EventEmitter — только typed-signals.
- **Behavior fields**: Инициализируйте все поля behaviors в `init()`, не через class field initializers. `init()` вызывается из конструктора LayoutController до инициализации полей подкласса.

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
│   │   │   ├── createScope.js   # Scope для functional flows
│   │   │   ├── gameFlowLoop.js  # Игровой цикл
│   │   │   └── ControllerStore.js
│   │   ├── services/            # Сервисы (AudioManager, StateMachine, SceneManager...)
│   │   └── common/
│   │       ├── core/            # BaseContainer, ObjectFactory, EngineContext
│   │       ├── displayObjects/  # SpineAnimation, ScreenLayout...
│   │       ├── layout/          # Layout система
│   │       ├── unified/         # Button, Slider
│   │       └── UI/              # CheckBox, CustomSlider...
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

### Declarative Child Scenes (SceneManager + Scene)

Сцены можно вкладывать декларативно через конфиг `children`. Дочерняя сцена автоматически монтируется в плейсхолдер родительского layout и следует за ним при смене вариантов (portrait/landscape/default).

**Конфиг в GameConfig.js:**

```js
scenes: {
    // Простая сцена — конструктор напрямую
    PreloaderScene,

    // Сцена с дочерними сценами — объект { Scene, children }
    HUDScene: {
        Scene: HUDScene,
        children: {
            Board_ph: "BoardScene",  // placeholder → имя дочерней сцены
        },
    },

    // Дочерняя сцена — регистрируется как обычная
    BoardScene,
},
```

**Как работает:**

1. `SceneManager.add()` принимает конструктор ИЛИ `{ Scene, children }`.
2. При наличии `children` для каждой пары `placeholder → sceneName` вызывается `Scene.mountInPlaceholder()`.
3. `mountInPlaceholder(name)` создаёт Container, находит плейсхолдер в текущем layout варианте, и подписывается на `onLayoutChange` для автоматического reparenting при смене варианта.
4. Дочерняя сцена показывается через `scenes.show()` с `root: mount`.

**Плейсхолдер в Figma/config:** пустой `SuperContainer` с суффиксом `_ph` (конвенция), задаёт позицию/размер/выравнивание в каждом варианте.

**Доступ к дочерней сцене из flow:**

```js
const hud = await scenes.show("HUDScene");   // создаёт и HUD, и BoardScene
const board = scenes.get("BoardScene");       // BoardScene уже доступна
board.setMultipliers(multipliers);
```

### Behavior System (LayoutBuilder + LayoutController)

Behaviors — контроллеры, автоматически навешиваемые на компоненты при построении layout. Наследуют `LayoutController`, создаются через `GameConfig.behaviors`.

```js
// GameConfig.js
behaviors: {
    ComponentTypeName: {           // ключ = имя типа компонента из Figma
        Behavior: SomeBehavior,    // класс, наследник LayoutController
        option1: "value",          // остальные поля → options
    },
},
```

**Ключевые точки:**
- `LayoutBuilder.#attachBehavior()` — единственная точка навешивания, вызывается в `buildLayout()` после `applyProperties`
- `container._behavior` / `container.behavior` — доступ к behavior на BaseContainer
- `scene.findBehavior(query)` — поиск behavior из Scene
- `ScreenLayout.setMode()` — автоматическая синхронизация состояния между вариантами через `getState()`/`setState()`
- Behavior добавляется через `addComponent()` → автоматический destroy/step/onScreenResize
- Подробная документация: `docs/behavior-system.md`
- Встроенные behaviors: `RadioGroupBehavior`, `TabsBehavior` — экспортируются из `onearm`, документация: `docs/builtin-behaviors.md`

## Технологии

- **PIXI.js 8.7** - 2D рендеринг
- **GSAP 3.13** - анимации
- **Spine** (@esotericsoftware/spine-pixi-v8) - скелетные анимации
- **ESBuild** - сборка
- **typed-signals** - событийная система
- **ES Modules** - формат модулей
