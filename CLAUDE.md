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

# dev with Figma components hot reload (polls Figma API for changes)
npm run dev -- -game=sandbox --watch-components
npm run dev -- -game=sandbox --watch-components --figma-interval=10000  # custom interval

# build
npm run build
npm run build:prod

# release
npm run release

# export fonts / assets from Figma
npm run fonts
npm run export           # Экспорт изображений (PNG/SVG спрайты)
npm run export:components  # Экспорт компонентов (components.config.json)
npm run pack             # Паковка картинок в спрайтшиты (@assetpack/core)

# watch mode for component export (standalone)
node bin/onearm-figma.js export-components --watch
node bin/onearm-figma.js export-components --watch --interval=10000  # 10s poll

# spine previewer (preview Spine animations from game assets)
npm run dev -- --spine-preview -game=sandbox
npm run spine-preview -- -game=gates-of-olympus

# generate Spine manifest for Figma plugin
npm run build:figma && node bin/onearm-figma.js generate-spine --game=<name>
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
│   │   ├── tools/               # Dev tools
│   │   │   └── spine-preview/   # Spine animation previewer (UI panel — HTMLScene)
│   │   ├── services/            # Сервисы (AudioManager, StateMachine, SceneManager...)
│   │   │   └── sceneManager/   # SceneManager, Scene, HTMLScene
│   │   └── common/
│   │       ├── core/            # BaseContainer, ObjectFactory, EngineContext
│   │       ├── displayObjects/  # SpineAnimation, ScreenLayout, EngineText...
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
│           ├── AnimationRegistry.js  # Реестр анимаций (Service)
│           ├── compose.js            # sequence(), parallel(), stagger()
│           ├── CascadeAnimation.js   # Cascade builder
│           └── clips/                # Clip-функции (1 файл = 1 анимация)
├── games/          # Проекты игр
│   ├── sandbox/    # Dev sandbox для тестирования
│   └── template/   # Шаблон новой игры
├── scripts/        # ESBuild сборка, экспорт Figma
└── static/         # HTML шаблон
```

### Declarative Child Scenes (SceneManager + Scene)

Сцены можно вкладывать декларативно через конфиг `children`. Дочерняя сцена автоматически монтируется в плейсхолдер родительского layout и следует за ним при смене modes (portrait/landscape/default).

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
3. `mountInPlaceholder(name)` создаёт Container, находит плейсхолдер в текущем layout mode, и подписывается на `onLayoutChange` для автоматического reparenting при смене mode.
4. Дочерняя сцена показывается через `scenes.show()` с `root: mount`.

**Плейсхолдер в Figma/config:** пустой `SuperContainer` с суффиксом `_ph` (конвенция), задаёт позицию/размер/выравнивание в каждом mode.

**HTMLScene** — DOM-based сцена для нативных HTML UI overlay'ев, управляется SceneManager наравне с PIXI-сценами. Создаёт `div` внутри `.canvas-box`, поддерживает `show()`/`hide()`/`destroy()` и `onResize()`. Используется для инструментов (Spine Previewer) и UI, которому нужен нативный DOM (инпуты, скролл и т.д.).

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
- `ScreenLayout.setMode()` — автоматическая синхронизация состояния между modes через `getState()`/`setState()`
- Behavior добавляется через `addComponent()` → автоматический destroy/step/onScreenResize
- Подробная документация: `docs/behavior-system.md`
- Встроенные behaviors: `RadioGroupBehavior`, `TabsBehavior` — экспортируются из `onearm`, документация: `docs/builtin-behaviors.md`

### Animation Clips (AnimationRegistry)

Система переиспользуемых GSAP-анимаций. 3 слоя: clip functions → composition helpers → registry.

**Clip** — чистая функция `(target, options?) → gsap.Timeline`, файл в `modules/slots/animations/clips/`. Имя файла = имя функции = ключ в реестре.

**Composition helpers** (`compose.js`): `sequence(items)`, `parallel(items)`, `stagger(items, factory, time)` — обёртки над GSAP `.add()`.

**AnimationRegistry** — сервис (`animations` в ServicesConfig), загружает дефолтные clips движка и перезаписывает из `GameConfig.animations`.

```js
// Акт использует clip из реестра
this.anim = getEngineContext().services.get("animations");
this.anim.get("payPresentation")(pay, { reels, hud, counterTarget: this, isTurbo });

// Игра подменяет clip через GameConfig
animations: {
    symbolWin: customSymbolWin,  // перезаписывает дефолтный clip движка
},
```

**Встроенные clips:** `symbolWin`, `symbolDestroy`, `symbolDrop`, `symbolTrigger`, `multiplierFly`, `winCounter`, `payPresentation`, `multiplierPresentation`, `cascade`.

**Правила:** clip всегда возвращает Timeline, принимает options с дефолтами, SFX через `timeline.playSfx()`, не обращается к registry внутри себя.

Подробная документация: `docs/animation-clips.md`

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
- **`build()`** — вызывает `resizeSystem.callOnContainerResize()` для рекурсивного `onScreenResize` всего дерева при сборке. Если конфиг содержит `modes`, автоматически создаёт `ScreenLayout`. `ScreenLayout` фильтрует modes по устройству через `#filterModes(modes, isMobile)`: desktop — только "default"/"desktop", mobile — только "portrait"/"landscape" (+ "default" как fallback).
- **Gotcha**: `addChild` триггерит `layout()` до установки `child.display` — поэтому recursive `callOnContainerResize` в `build()` необходим для корректного начального позиционирования.

## Layout Config Format (components.config.json)

Конфигурация layout экспортируется из Figma и разделяет два типа вариаций:

- **`modes`** — экранные режимы (viewport layouts), только у Scene. Управляются `ScreenLayout`, переключаются при ресайзе.
- **`variants`** — визуальные состояния компонента (size, state и т.д.). Резолвятся `LayoutBuilder` при построении.

```json
// Сцена с экранными режимами — type: "Scene", modes
{
  "name": "HUDScene",
  "type": "Scene",
  "modes": {
    "default": { "type": "BaseContainer", "children": [...] },
    "portrait": { "type": "BaseContainer", "children": [...] }
  }
}

// Компонент с вариантами состояний — type + variants
{
  "name": "BetSelector",
  "type": "RadioGroup",
  "variants": { "3items": { ... }, "5items": { ... } }
}

// Простой компонент — flat
{ "name": "WinLabel", "type": "Text", "text": "You Win!" }
```

**Правила:**
- `modes` бывают ТОЛЬКО у Scene (суффикс `Scene` в Figma → `isScene: true` в componentRegistry)
- Обычные компоненты НИКОГДА не получают `modes`, даже если значения их вариантов совпадают с именами modes (`default`, `portrait`)
- `LayoutBuilder.build()` автоматически определяет: `config.modes` → `ScreenLayout`, иначе обычный build

## Figma Export Tool

Исходники: `tools/figma/src/` (TypeScript). Собирается в `tools/figma/dist/cli.js`.
После изменений в исходниках ОБЯЗАТЕЛЬНО: `npm run build:figma`
Экспорт компонентов: `node bin/onearm-figma.js export-components`
Регистрация нового типа: `componentRegistry.ts` (registerComponentType) + процессор в `specialProcessors.ts`

### Figma Plugin (Spine Components)

`tools/figma/plugin/` — плагин для создания Spine-компонентов в Figma.
Workflow: `generate-spine` CLI → `spine-manifest.json` → Figma plugin → ComponentSet per skeleton.
Каждая анимация — отдельный variant со своим размером (из attachment bounds).
Сборка плагина: `npm run build:figma` (собирает и CLI, и plugin).
Манифест плагина: `tools/figma/plugin/manifest.json`.

### Watch mode (hot reload компонентов)

`export-components --watch` опрашивает Figma API (`GET /v1/files/:key?depth=1`) каждые 5 сек, сравнивает `lastModified`. При изменении — полный re-export → запись `components.config.json` → esbuild подхватывает → SSE reload страницы. Интеграция с dev-сервером: `--watch-components` флаг в `esbuild-serve.js` запускает watch как child process.

### Типы текстов (Figma → движок)

| Figma textAutoResize | Тип в движке | Поведение |
|---|---|---|
| `WIDTH_AND_HEIGHT` (Auto) | `Text` | Обычный текст |
| `HEIGHT` (Fixed width) | `Text` + `wordWrap` | Перенос строк |
| `NONE` (Fixed size) | `EngineText` + `maxWidth` | Авто-скейл по ширине |

`EngineText` — наследник PIXI Text, автоматически масштабирует текст при изменении `.text` если ширина превышает `maxWidth`. Документация: `docs/engine-text.md`

## Asset Pipeline

### Auto-Discovery Manifest

`scripts/generate-manifest.js` сканирует `assets/` и генерирует `resources-manifest.js` автоматически при `dev`/`build`. Файл в `.gitignore` — НЕ редактировать вручную.

**Конвенции:**
- `assets/fonts/*.ttf` → bundle `logo`, alias = имя файла без `-Regular` и т.д.
- `assets/sound/*.mp3` → bundle `sounds`, alias = имя файла; `.ogg` как fallback
- `assets/spine/{bundle}/{dir}/` → bundle по имени папки, alias по имени файла скелета/атласа: `{filename}Data` + `{filename}Atlas`. Папка может содержать несколько скелетов с общим атласом — каждый скелет становится отдельной записью. Loose файлы в корне bundle-директории тоже поддерживаются.
- `assets/spritesheet/{bundle}/*.json` → готовые JSON+PNG спрайтшиты, bundle по имени папки
- `assets/img/{name}{tps}/` → bundle `main`, spritesheet через AssetPack
- `assets/img/*.png` → bundle `main`, WebP+PNG fallback

Build order: `generateManifest()` → `packAssets()` → `esbuild` → `copyFiles(exclude: img)`.

### Image Packing

Паковка картинок через `@assetpack/core` (`scripts/pack-assets.js`). Папки с тегом `{tps}` в `assets/img/` пакуются в spritesheet + WebP. Остальные файлы конвертируются в WebP с PNG fallback.

### Spine Loader Fix

`Game.js` патчит `@esotericsoftware/spine-pixi-v8` skeleton loader — его `test()` перехватывает все `.json` файлы и загружает как binary, ломая spritesheet и другие JSON-ассеты. Патч ограничивает spine loader только `.skel` файлами в фазе `load`.

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
