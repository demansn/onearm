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
│   │   ├── ServiceLocator.js    # Класс Service Locator (не синглтон, создаётся в Game.js)
│   │   ├── AsyncAction.js       # Обертка для асинхронных действий
│   │   ├── AsyncActionsScenario.js  # Управление последовательностью актов
│   │   ├── ActsRunner.js        # Запуск актов
│   │   ├── flow/                # Game flow система
│   │   │   ├── async.js         # Async primitives (delay, waitForSignal, waitForAny, waitUntil)
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

### Доступ к сервисам (DI)

Синглтон `services` удалён из `ServiceLocator.js`. Сервисы доступны через DI:

1. **`Game.js`** — создаёт локальный `new ServiceLocator()`, передаёт его в сервисы и flow context
2. **`Scene`** — получает `services` через конструктор (передаётся SceneManager): `this.services`
3. **`EngineContext`** — содержит поле `services`, доступ через `getEngineContext().services` (для внутренних компонентов движка: ObjectFactory, UI, slots)
4. **Flow context (`ctx`)** — содержит все сервисы через `services.getAll()`, доступ: `ctx.scenes`, `ctx.gameLogic` и т.д.

```js
// В Scene:
class MyScene extends Scene {
    create() {
        const audio = this.services.get("audio");
    }
}

// Во flow:
async function myFlow(scope, ctx) {
    const scenes = ctx.scenes;
    const gameLogic = ctx.gameLogic;
}

// В компонентах движка (ObjectFactory, UI и т.д.):
import { getEngineContext } from "onearm";
const { services } = getEngineContext();
```

**Barrel export:** `onearm` экспортирует `ServiceLocator` как именованный экспорт (не default, не `export *`).

### Позиционирование объектов

- **`applyDisplayProperties(object, properties, context)`** — утилита из `utils/applyDisplayProperties.js`. Zone-based позиционирование (fullScreen/save/game), anchor, scale, pivot, offset. Используется в `ObjectFactory.createObject()`.
- **ZoneContainer children** — позиционируются через `child.display = { align, offset }`. Layout пропускает children без `display.align` (сохраняют x/y из applyProperties).
- **`build()` / `buildScreenLayout()`** — вызывают `resizeSystem.callOnContainerResize()` для рекурсивного `onScreenResize` всего дерева при сборке. `ScreenLayout` фильтрует варианты по устройству через `#filterVariants(variants, isMobile)`: desktop — только "default"/"desktop", mobile — только "portrait"/"landscape" (+ "default" как fallback).
- **Gotcha**: `addChild` триггерит `layout()` до установки `child.display` — поэтому recursive `callOnContainerResize` в `build()` необходим для корректного начального позиционирования.

## Figma Export Tool

Исходники: `tools/figma/src/` (TypeScript). Собирается в `tools/figma/dist/cli.js`.
После изменений в исходниках ОБЯЗАТЕЛЬНО: `npm run build:figma`
Экспорт компонентов: `node bin/onearm-figma.js export-components`
Регистрация нового типа: `componentRegistry.ts` (registerComponentType) + процессор в `specialProcessors.ts`

## PixiJS 8 Gotchas

- **НЕТ `worldVisible`** — это PixiJS 7 API. Используй `globalDisplayStatus < 7` (битмаска: visible + parent visible + renderable = 7)
- **`DOMContainer` баг** — CanvasObserver добавляет двойное смещение когда canvas внутри positioned container. Для DOM-элементов поверх canvas используй `renderer.runners.postrender` напрямую (как DOMPipe), минуя CanvasObserver
- **`super()` вызывает сеттеры** — Container/DOMContainer обрабатывает options в конструкторе и может вызвать сеттеры подкласса до завершения инициализации. Деструктурируй чувствительные props перед `super()`
- **`groupAlpha`** — accumulated alpha через parent chain (аналог worldAlpha из v7)
- **`onRender`** — callback на Container, вызывается только когда контейнер visible в render tree

## Технологии

- **PIXI.js 8.7** - 2D рендеринг
- **GSAP 3.13** - анимации
- **Spine** (@esotericsoftware/spine-pixi-v8) - скелетные анимации
- **ESBuild** - сборка
- **typed-signals** - событийная система
- **ES Modules** - формат модулей
