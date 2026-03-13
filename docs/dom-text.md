# DOMText

## Что это

DOMText — display object, который рендерит текст через настоящий HTML `<div>`, расположенный поверх PixiJS canvas. В отличие от PIXI Text/BitmapText, текст в DOMText **выделяемый и копируемый** — это обычный DOM-элемент с `user-select: text`.

Используется для юридических текстов, лицензий, версий — везде, где пользователь должен иметь возможность выделить и скопировать текст.

---

## Почему не PixiJS DOMContainer

PIXI.js предоставляет встроенный механизм DOM-элементов через `DOMContainer` + `CanvasObserver`. Однако `CanvasObserver` содержит баг двойного смещения (double-offset), когда canvas находится внутри позиционированного контейнера (`.canvas-box` с `position: fixed`). DOMText обходит эту проблему, размещая `<div>` напрямую в `.canvas-box` и используя `worldTransform` для CSS-позиционирования — тот же подход, что и в DOMPipe.

---

## Архитектура

```
DOMText extends Container (PIXI)
  │
  ├── Создаёт HTML <div> с position:absolute
  ├── Хукается в renderer.runners.postrender (как DOMPipe)
  └── В postrender():
      ├── globalDisplayStatus < 7 → display:none
      ├── Первый видимый кадр → appendChild в .canvas-box
      ├── worldTransform → CSS matrix() transform
      └── groupAlpha → CSS opacity
```

**Ключевые механизмы:**

- **postrender runner** — `renderer.runners.postrender.add(this)`. Callback `postrender()` вызывается после каждого рендер-кадра, независимо от visibility контейнера. Это тот же механизм, что использует DOMPipe.
- **globalDisplayStatus** — внутреннее свойство PIXI Container. Значение `7` означает полную видимость (сам объект + все родители visible). При значении < 7 div скрывается через `display: none`.
- **worldTransform** — матрица трансформации в CSS-пикселях (при `autoDensity: true`). Применяется как `CSS matrix(a, b, c, d, tx, ty)` с `transform-origin: 0 0`.
- **groupAlpha** — итоговая прозрачность с учётом всех родителей. Напрямую маппится в `CSS opacity`.
- **Lazy mount** — div добавляется в DOM (`.canvas-box`) только при первом видимом кадре, не в конструкторе.

---

## Figma pipeline

### Компонент в Figma

В Figma создаётся компонент с именем, оканчивающимся на `DOMText`. Внутри компонента должен быть дочерний TEXT node — из него извлекаются текст и стили.

### Регистрация в componentRegistry

```typescript
// tools/figma/src/core/componentRegistry.ts
registerComponentType({
  match: 'DOMText',
  type: 'DOMText',
  process: processDOMText,
});
```

Матчинг по суффиксу (режим по умолчанию) — любой компонент с именем `*DOMText` будет обработан.

### Процессор (processDOMText)

```typescript
// tools/figma/src/handlers/special/specialProcessors.ts
export function processDOMText(node, context, processNode) {
  // 1. Ищет TEXT node: сам node или первый TEXT-child
  // 2. Извлекает commonProps (x, y) и textProps (text, style)
  // 3. Добавляет width/height от node
  // 4. Возвращает конфиг с type: "DOMText"
}
```

### Результат в components.config.json

```json
{
  "name": "LegalText",
  "type": "DOMText",
  "x": 20,
  "y": 850,
  "width": 360,
  "height": 40,
  "text": "2024 All rights reserved",
  "style": {
    "fontFamily": "Inter",
    "fontSize": 12,
    "fontWeight": "400",
    "lineHeight": 16,
    "fill": 8421504,
    "align": "left"
  }
}
```

---

## Регистрация в движке

```javascript
// modules/engine/common/displayObjects/addObjects.js
import { DOMText } from "./DOMText.js";

ObjectFactory.registerObjectConstructor("DOMText", DOMText);
```

`registerObjectConstructor` — конфиг передаётся напрямую в конструктор (`new DOMText(config)`), без фабричной функции. Renderer получается внутри конструктора через `getEngineContext().services.get("app").renderer`.

---

## Формат конфига

```javascript
{
  name: "LegalText",        // имя для layout.find()
  type: "DOMText",          // тип для ObjectFactory
  x: 20,                    // позиция
  y: 850,
  width: 360,               // ширина div (px)
  height: 40,               // высота div (px)
  text: "Some text",        // содержимое textContent
  style: {                  // маппинг на CSS-свойства
    fontFamily: "Inter",    // → font-family
    fontSize: 12,           // → font-size (px)
    fontWeight: "400",      // → font-weight
    lineHeight: 16,         // → line-height (px)
    fill: 0x808080,         // → color (#hex)
    align: "left",          // → text-align
    wordWrap: true,         // → word-wrap: break-word + overflow-wrap: break-word
  }
}
```

**Маппинг стилей** (`STYLE_MAP`):

| Config key | CSS property |
|---|---|
| `fontFamily` | `font-family` |
| `fontSize` | `font-size` (+ `px`) |
| `fontWeight` | `font-weight` |
| `lineHeight` | `line-height` (+ `px`) |
| `align` | `text-align` |
| `fill` | `color` (number → `#hex`) |

---

## Runtime API

### text (getter/setter)

```javascript
const domText = layout.find("LegalText");
console.log(domText.text);       // текущий textContent
domText.text = "New content";    // обновить текст
```

### updateStyle(style)

Обновляет CSS-стили div. Принимает тот же формат, что и `style` в конфиге.

```javascript
domText.updateStyle({ fill: 0xff0000, fontSize: 16 });
```

### width / height (getter/setter)

Переопределяют стандартные PIXI Container `width`/`height`. Возвращают и устанавливают размеры HTML div, а не bounds контейнера.

```javascript
domText.width = 500;   // → div.style.width = "500px"
domText.height = 100;  // → div.style.height = "100px"
```

### destroy(options)

Автоматически:
1. Отписывается от `renderer.runners.postrender`
2. Удаляет div из DOM
3. Вызывает `super.destroy()`

---

## Особенности

- **pointer-events: auto** — div перехватывает клики (для выделения текста). Учитывайте это при наложении с интерактивными PIXI-объектами.
- **overflow: hidden** — текст, выходящий за пределы width/height, обрезается.
- **Оптимизация transform** — CSS `matrix()` обновляется только при изменении `worldTransform` (сравнение строк `_lastTransform`).
- **Нет поддержки ScreenLayout modes** — DOMText не является BaseContainer, поэтому behavior system к нему не применяется. При необходимости используйте в разных modes как отдельные объекты.
