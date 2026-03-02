# Built-in Behaviors

Движок поставляет набор готовых behavior-ов для типовых UI-паттернов. Они находятся в `modules/engine/common/behaviors/` и экспортируются из `onearm`.

```javascript
import { RadioGroupBehavior, TabsBehavior } from "onearm";
```

---

## RadioGroupBehavior

Универсальная радио-группа для CheckBox/Toggle компонентов. Гарантирует, что активен ровно один элемент из группы.

### Опции

| Опция | Тип | По умолчанию | Описание |
|---|---|---|---|
| `items` | `string[]` | **обязательно** | Имена дочерних элементов (CheckBox, Toggle и т.п.) |
| `activeIndex` | `number` | `0` | Индекс активного элемента при инициализации |

### API

| Член | Тип | Описание |
|---|---|---|
| `onChange` | `Signal<(index: number)>` | Срабатывает при смене активного элемента |
| `activeIndex` | `number` (getter) | Текущий активный индекс |
| `setActive(index)` | метод | Программная смена активного элемента |

### Как работает

1. В `init()` находит дочерние элементы по именам из `items` через `this.find(name)`
2. Подписывается на `onChange` каждого элемента через `this.connectSignal()`
3. При клике на элемент вызывает `setActive(i)` — устанавливает `setState(true)` на активном, `setState(false)` на остальных
4. Эмитит `onChange` с индексом нового активного элемента

### Требования к дочерним элементам

Элементы из `items` должны реализовать:
- `onChange` — Signal, который эмитится при взаимодействии (клик/тап)
- `setState(active: boolean)` — установка визуального состояния (вкл/выкл)

Стандартные CheckBox и Toggle из onearm удовлетворяют этим требованиям.

### Конфиг

```javascript
// GameConfig.js
behaviors: {
    NavBar: {
        Behavior: RadioGroupBehavior,
        items: ["RulesToggle", "FairToggle", "HistoryToggle"],
        activeIndex: 0,
    },
},
```

### Пример доступа из сцены

```javascript
class InfoScene extends Scene {
    create() {
        const nav = this.findBehavior("NavBar");
        nav.onChange.connect(index => {
            console.log("Selected tab:", index);
        });
        nav.setActive(1); // программно переключить на второй элемент
    }
}
```

---

## TabsBehavior

Контроллер табов. Связывает навигацию (RadioGroupBehavior) с панелями контента — при переключении табa показывает соответствующую панель.

### Опции

| Опция | Тип | По умолчанию | Описание |
|---|---|---|---|
| `nav` | `string` | **обязательно** | Имя дочернего контейнера с RadioGroupBehavior |
| `content` | `string` | **обязательно** | Имя контейнера, содержащего панели |
| `tabs` | `string[]` | **обязательно** | Имена панелей внутри `content` |
| `activeIndex` | `number` | `0` | Индекс активной панели при инициализации |

### API

| Член | Тип | Описание |
|---|---|---|
| `activeIndex` | `number` (getter) | Текущий активный индекс |
| `setActive(index)` | метод | Программная смена активной вкладки |

### Как работает

1. В `init()` находит контейнер навигации (`nav`) и получает его `.behavior` (RadioGroupBehavior)
2. Находит контейнер контента (`content`) и внутри него панели по именам из `tabs`
3. Подписывается на `onChange` RadioGroupBehavior через `this.connectSignal()`
4. При смене таба — показывает нужную панель (`visible = true`), скрывает остальные (`visible = false`)
5. `setActive(index)` делегирует переключение навигации в RadioGroupBehavior, который в свою очередь триггерит показ панели

### Паттерн композиции

TabsBehavior **не реализует** навигацию сам — он **делегирует** её RadioGroupBehavior. Это ключевой паттерн:

```
TabsBehavior
  ├── nav: контейнер с RadioGroupBehavior  → управляет toggle-ами
  └── content: контейнер с панелями        → управляет видимостью
```

Порядок инициализации гарантирован: дочерние элементы строятся первыми при `buildLayout`, поэтому `RadioGroupBehavior.init()` выполняется **раньше** `TabsBehavior.init()`. К моменту, когда TabsBehavior обращается к `navContainer.behavior`, RadioGroupBehavior уже создан.

### Конфиг

```javascript
// GameConfig.js
import { RadioGroupBehavior, TabsBehavior } from "onearm";

behaviors: {
    // Сначала RadioGroupBehavior на навигационную панель
    NavBar: {
        Behavior: RadioGroupBehavior,
        items: ["RulesToggle", "FairToggle", "HistoryToggle"],
    },

    // Затем TabsBehavior на родительский контейнер
    InfoPopupTabs: {
        Behavior: TabsBehavior,
        nav: "NavBar",           // имя контейнера с RadioGroupBehavior
        content: "content",      // имя контейнера с панелями
        tabs: ["1", "2", "3"],   // имена панелей внутри content
    },
},
```

### Структура в Figma

```
InfoPopupTabs (SuperContainer)
  ├── NavBar (SuperContainer)          → RadioGroupBehavior
  │   ├── RulesToggle (CheckBox)
  │   ├── FairToggle (CheckBox)
  │   └── HistoryToggle (CheckBox)
  └── content (SuperContainer)
      ├── 1 (SuperContainer)           → панель "Rules"
      ├── 2 (SuperContainer)           → панель "Fair"
      └── 3 (SuperContainer)           → панель "History"
```

### Пример доступа из flow

```javascript
async function infoPopupIdle(scope, ctx) {
    const scene = ctx.scenes.get("InfoScene");
    const tabs = scene.findBehavior("InfoPopupTabs");

    tabs.setActive(0); // открыть первую вкладку

    // Ждать переключения через RadioGroupBehavior
    const nav = scene.findBehavior("NavBar");
    const selectedIndex = await scope.wait(nav.onChange);
}
```

---

## State Sync

Оба behavior реализуют `getState()` / `setState()` для корректной синхронизации при смене варианта ScreenLayout (portrait <-> landscape):

```javascript
// RadioGroupBehavior и TabsBehavior
getState()  → { activeIndex: number }
setState({ activeIndex }) → вызывает setActive(activeIndex)
```

При переключении ориентации активная вкладка/элемент сохраняется автоматически.

---

## Правила и подводные камни

1. **Инициализация состояния только в `init()`** — все поля (`_activeIndex`, `_items`, `_panels` и т.д.) должны инициализироваться в `init()`, а **не** как class fields. Причина: `init()` вызывается из конструктора `LayoutController` **до** выполнения инициализаторов class fields. Если написать `_items = []` как class field, он перезапишет значение, установленное в `init()`.

2. **Сигналы — только `Signal` из `typed-signals`** — не EventEmitter, не кастомные решения. `connectSignal()` из LayoutController обеспечивает автоматический cleanup при destroy.

3. **`#` private fields запрещены** — по той же причине, что и class fields: порядок инициализации конструктора.

4. **Порядок behaviors в конфиге не важен** — порядок вызова `init()` определяется порядком построения layout (bottom-up), а не порядком записей в `GameConfig.behaviors`.

5. **Элементы `items` должны поддерживать протокол onChange/setState** — RadioGroupBehavior не проверяет наличие этих методов строго (`item?.onChange`, `item?.setState`), но без них поведение будет неполным.

6. **TabsBehavior без RadioGroupBehavior не работает** — TabsBehavior ожидает `.behavior` на навигационном контейнере. Если RadioGroupBehavior не навешан на `nav`, переключение табов через UI работать не будет (только программное через `_showPanel`).
