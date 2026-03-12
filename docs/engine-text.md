# EngineText

## Что это

EngineText — расширенный PIXI Text с автоматическим масштабированием текста под заданную максимальную ширину (`maxWidth`). Когда содержимое текста превышает `maxWidth`, объект равномерно уменьшается (scale) чтобы вписаться.

Используется для текстов с динамическим содержимым в ограниченном пространстве — баланс, ставка, выигрыш и другие значения, которые могут менять длину.

---

## Как работает

```
EngineText extends Text (PIXI)
  │
  ├── constructor({ maxWidth, text, style })
  │     └── _fitScale() — начальный расчёт
  │
  └── set text(value)
        ├── super.text = value
        └── _fitScale()
              ├── scale.set(1)  — сброс масштаба
              └── if (width > maxWidth) → scale.set(maxWidth / width)
```

**Ключевой механизм:**
- При каждом изменении `.text` вызывается `_fitScale()`
- Масштаб сбрасывается до 1, измеряется натуральная ширина
- Если ширина превышает `maxWidth`, объект масштабируется равномерно (scale.x = scale.y)
- Если текст вмещается — scale остаётся 1

---

## Figma pipeline

### Настройка в Figma

Текстовый слой должен быть в режиме **Fixed size** (фиксированные ширина И высота). В Figma это настраивается через:
- Design panel → Text → Resizing → Fixed size

Ширина текстового фрейма становится `maxWidth`.

### Маппинг textAutoResize

| Figma textAutoResize | Figma UI | Тип в движке | Поведение |
|---|---|---|---|
| `WIDTH_AND_HEIGHT` | Auto (Hug) | `Text` | Обычный текст, без ограничений |
| `HEIGHT` | Fixed width | `Text` + `wordWrap` | Перенос строк по ширине |
| `NONE` | Fixed size | `EngineText` + `maxWidth` | Авто-скейл по ширине |

### REST API особенность

Figma REST API **не возвращает** поле `textAutoResize` когда значение `NONE` — просто пропускает его. Адаптер `RestNodeAdapter` обрабатывает это: `this.data.style?.textAutoResize ?? 'NONE'`.

### Результат в components.config.json

```json
{
  "name": "BalanceValue",
  "type": "EngineText",
  "x": 169,
  "y": 27,
  "text": "0",
  "maxWidth": 118,
  "style": {
    "fontFamily": "Alfa Slab One",
    "fontSize": 24,
    "fontWeight": 400,
    "align": "right",
    "fill": "rgba(243,224,183,1)"
  },
  "anchorX": 1,
  "anchorY": 0.5
}
```

---

## Регистрация в движке

```javascript
// modules/engine/common/displayObjects/addObjects.js
import { EngineText } from "./EngineText.js";

ObjectFactory.registerObjectFactory("EngineText", ({ style, text, maxWidth }, factory) => {
    if (style && typeof style === "string") {
        const resolved = factory.getStyle(style);
        if (resolved) style = resolved;
    }
    return new EngineText({ text, style, maxWidth });
});
```

Фабрика поддерживает именованные стили (строковые ссылки на `Styles` сервис).

---

## Runtime API

### text (getter/setter)

```javascript
const balance = layout.find("BalanceValue");
balance.text = "999,999.99";  // автоматически подстроит масштаб
```

### _fitScale()

Внутренний метод, вызывается автоматически при изменении `.text`. Можно вызвать вручную если нужно пересчитать масштаб.

```javascript
balance._fitScale();
```

---

## Сравнение текстовых типов

| Свойство | Text | EngineText | DOMText | TextBlock |
|---|---|---|---|---|
| Авто-скейл | - | maxWidth | - | - |
| Перенос строк | wordWrap | - | CSS | wordWrap |
| Выделяемый | - | - | + | - |
| Inline картинки | - | - | - | + |
| Множественные стили | - | - | - | + |
| Шаблоны `{{var}}` | - | - | - | + |
