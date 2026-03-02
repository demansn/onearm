# Behavior System

## Принцип

Behavior — это контроллер, который **автоматически** навешивается на компонент при построении layout. Не нужно создавать его вручную в сцене — достаточно прописать в `GameConfig.behaviors`, и при каждом вызове `buildLayout` behavior будет создан и привязан к контейнеру.

**Когда использовать Behavior вместо обычного контроллера:**

| Обычный контроллер | Behavior |
|---|---|
| Создаётся вручную в `Scene.create()` | Создаётся автоматически при построении layout |
| Привязан к конкретной сцене | Привязан к **типу компонента** — работает в любой сцене |
| Нужен доступ к Scene-уровневым вещам | Самодостаточный, работает только с layout-элементами |
| Используется один раз | Переиспользуется: где появился компонент — там появился behavior |

**Behavior подходит для:** табы, аккордеоны, переключатели страниц, анимации при наведении, toggle-группы — любое поведение, привязанное к структуре компонента, а не к логике игры.

---

## Как работает

```
GameConfig.behaviors → LayoutBuilder → #attachBehavior() → container._behavior
```

1. В `GameConfig.behaviors` прописывается маппинг: имя компонента → класс Behavior + опции
2. `LayoutBuilder.buildLayout()` строит display object из конфига
3. После `applyProperties` вызывается `#attachBehavior(displayObject, config)`
4. Если для этого компонента есть запись в `behaviorsConfig`, создаётся инстанс Behavior
5. Behavior навешивается через `displayObject.addComponent(behavior)` — получает lifecycle (destroy, step, onScreenResize)
6. Ссылка сохраняется в `displayObject._behavior`

---

## Конфигурация

```javascript
// GameConfig.js
import { TabsBehavior } from "./behaviors/TabsBehavior.js";
import { AccordionBehavior } from "./behaviors/AccordionBehavior.js";

export const GameConfig = {
    behaviors: {
        // Ключ = имя типа компонента из Figma (не instance name)
        SettingsTabs: {
            Behavior: TabsBehavior,      // класс, наследник LayoutController
            nav: "NavTabs",              // остальные поля → options
            content: "Content",
        },
        InfoAccordion: {
            Behavior: AccordionBehavior,
            expandedIndex: 0,
        },
    },
};
```

**Ключ** — имя типа компонента. Для обычных объектов это `config.name`, для instance — `config.type`. Это означает: все инстансы одного типа получают одинаковый behavior.

---

## Создание Behavior

Behavior наследует `LayoutController`. Это даёт:
- `this.layout` — контейнер, к которому привязан behavior
- `this.options` — опции из конфига (всё кроме `Behavior`)
- `this.find(name)`, `this.get(name)`, `this.findAll(name)`, `this.forAll(name, fn)` — поиск по layout
- `this.connectSignal(signal, handler)`, `this.connectButton(name, signal)` — подписки с автоочисткой
- `this.setVisible(name, visible)`, `this.setEnabled(name, enabled)` — утилиты
- `init()` — вызывается в конструкторе, точка входа для настройки
- `destroy()` — автоматический cleanup сигналов через `components[]`

**Важно:** `init()` вызывается из конструктора LayoutController. Из-за порядка инициализации JS private fields (`#`) нельзя использовать в классах-наследниках LayoutController. Используйте `_` конвенцию.

### Минимальный пример

```javascript
import { LayoutController } from "onearm";
import { Signal } from "typed-signals";

export class TabsBehavior extends LayoutController {
    onChange = new Signal();
    _activeIndex = 0;

    init() {
        const { nav, content, activeIndex = 0 } = this.options;
        this._activeIndex = activeIndex;

        const navContainer = this.find(nav);
        if (navContainer) {
            navContainer.children.forEach((item, i) => {
                if (item.onPress) {
                    this.connectSignal(item.onPress, () => this.setActive(i));
                }
            });
        }

        this.setActive(activeIndex);
    }

    get activeIndex() { return this._activeIndex; }

    setActive(index) {
        this._activeIndex = index;

        const navContainer = this.find(this.options.nav);
        if (navContainer) {
            navContainer.children.forEach((item, i) => {
                if (item.setState) item.setState(i === index);
            });
        }

        const contentContainer = this.find(this.options.content);
        if (contentContainer) {
            contentContainer.children.forEach((page, i) => {
                page.visible = (i === index);
            });
        }

        this.onChange.emit(index);
    }

    // State sync для ScreenLayout (portrait ↔ landscape)
    getState() { return { activeIndex: this._activeIndex }; }
    setState({ activeIndex }) {
        if (activeIndex !== undefined) this.setActive(activeIndex);
    }
}
```

---

## Доступ к Behavior

### Из Scene

```javascript
class SettingsScene extends Scene {
    create() {
        // Layout и behavior созданы автоматически при buildLayout
        const tabs = this.findBehavior("SettingsTabs");
        tabs.onChange.connect(index => {
            console.log("Active tab:", index);
        });
    }
}
```

`findBehavior(query)` — ищет контейнер через `layout.find(query)`, возвращает `container.behavior`.

### Из Flow

```javascript
async function settingsIdle(scope, ctx) {
    const settings = ctx.scenes.get("SettingsScene");
    const tabs = settings.findBehavior("SettingsTabs");

    tabs.setActive(0);
    await scope.wait(tabs.onChange);
}
```

### Напрямую через контейнер

```javascript
const container = layout.find("SettingsTabs");
const behavior = container.behavior;  // getter на BaseContainer
```

---

## State Sync (portrait ↔ landscape)

При использовании `ScreenLayout` для каждого варианта (portrait, landscape, default) строится **отдельное** дерево layout. Это значит, что у каждого варианта — свой инстанс behavior.

При переключении варианта (`setMode`) ScreenLayout автоматически:
1. Собирает все behaviors из предыдущего layout (по `label`)
2. Находит одноимённые behaviors в новом layout
3. Вызывает `newBehavior.setState(prevBehavior.getState())`

Для этого behavior должен реализовать `getState()` и `setState()`:

```javascript
// Возвращает состояние, которое нужно сохранить
getState() {
    return { activeIndex: this._activeIndex };
}

// Восстанавливает состояние
setState({ activeIndex }) {
    if (activeIndex !== undefined) this.setActive(activeIndex);
}
```

Если behavior не переопределяет эти методы — базовая реализация в LayoutController возвращает `{}` и ничего не делает. Состояние просто сбрасывается при смене варианта.

---

## Lifecycle

```
buildLayout()
  → new BehaviorCls(displayObject, options)    // конструктор LayoutController
    → init()                                    // настройка behavior
  → displayObject.addComponent(behavior)        // регистрация в component system

// Во время работы:
  → step(event)                                 // если behavior реализует step()
  → onScreenResize(event)                       // при ресайзе

// При смене варианта ScreenLayout:
  → prevBehavior.getState()
  → newBehavior.setState(state)

// При уничтожении контейнера:
  → destroy()                                   // автоматический cleanup сигналов
  → displayObject._behavior = null
```

---

## Правила

1. **Behavior наследует LayoutController** — это обязательно для автоматического cleanup и lifecycle
2. **Ключ в behaviors — имя типа компонента**, не instance name
3. **Не используйте `#` private fields** в behavior-классах (из-за вызова `init()` из конструктора LayoutController)
4. **`getState()`/`setState()` — опциональны**, но необходимы для корректной работы с ScreenLayout
5. **Behavior не знает про Scene** — работает только с layout-элементами через `this.find()`
6. **Один behavior на контейнер** — повторное навешивание защищено guard-ом
7. **Для не-BaseContainer объектов behavior не навешивается** — guard проверяет наличие `addComponent`

---

## Чеклист: создание нового Behavior

1. Создай класс, наследующий `LayoutController`
2. Реализуй `init()` — найди элементы, подпишись на сигналы через `connectSignal()`
3. Добавь публичные сигналы (`onChange`, `onSelect`) и методы
4. Если нужна синхронизация при смене варианта — реализуй `getState()` / `setState()`
5. Пропиши в `GameConfig.behaviors` с ключом = имя типа компонента в Figma
6. Проверь: `scene.findBehavior("ComponentName")` возвращает инстанс

---

## Анти-паттерны

- **Бизнес-логика в behavior** → behavior управляет UI-поведением компонента, бизнес-логика во flow
- **Behavior, который обращается к services** → behavior работает только с layout, для services используй контроллеры в сцене
- **`#` private fields в behavior** → используй `_` конвенцию (init вызывается до инициализации private fields)
- **Создание behavior вручную** → если нужно создать руками, это обычный контроллер, не behavior
- **Один behavior на несколько несвязанных контейнеров** → behavior привязан к одному контейнеру, декомпозируй
