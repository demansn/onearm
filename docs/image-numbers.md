# ImageNumbers

## Что это

ImageNumbers — контейнер, который рендерит число/строку как ряд **спрайтов-глифов** вместо
шрифта. Каждый символ маппится (через `textureMap`) в alias текстуры, берётся из сервиса
`resources`, инстанцируется как `Sprite` и выкладывается слева направо.

Используется для значений, которым нужны пиксель-арт глифы, а не шрифт: множители/счётчики
(например, бейджи wild «2X».."10X").

---

## Как работает

```
ImageNumbers extends Container (PIXI)
  │
  ├── constructor({ resources, textureMap, size })
  │     ├── _resources  — сервис "resources" (.get(alias) → Texture)
  │     ├── _textureMap — char → alias (по умолч. 0-9, ".", "x"/"X")
  │     ├── _size        — целевая высота глифа (null = натуральный размер)
  │     └── anchor       — Point(0.5, 0.5), групповой anchor по обеим осям
  │
  ├── setValue(value, decimals = 2)
  │     ├── number → value.toFixed(decimals); иначе String(value)
  │     ├── destroy старых спрайтов (пул-безопасно), сборка новых
  │     ├── scale каждого глифа под _size (если задан)
  │     └── сдвиг детей по anchor на уровне children (dx = -width*anchor.x)
  │
  └── setSize(size) — меняет _size и перерисовывает последнее значение
```

**Ключевые моменты:**
- `anchor` применяется **на уровне детей** (сдвиг их `x`/`y`), а не через `pivot`/`position`
  контейнера. Это сделано намеренно: ImageNumbers обычно крепится к slot-кости Spine через
  `addSlotObject`, и Spine каждый кадр перезаписывает `transform` контейнера по кости —
  `pivot`/`position` нейтрализуются, влияют только позиции дочерних спрайтов.
  `anchor.x=0` → строка справа от кости, `0.5` → по центру, `1` → слева.
- `setValue` уничтожает старые спрайты (не просто `removeChildren`), т.к. символы пулятся и
  `reset()` дёргает `setValue()` многократно. `destroy()` по умолчанию НЕ трогает texture
  (она шарится между инстансами).
- Если для символа нет alias или текстуры — он пропускается (`console.warn` при missing texture).

---

## Регистрация в движке

```javascript
// modules/engine/common/displayObjects/addObjects.js
import { ImageNumbers } from "./ImageNumbers.js";

ObjectFactory.registerObjectFactory("ImageNumbers", (params, factory, services) =>
    new ImageNumbers({ ...params, resources: services.get("resources") }));
```

`resources` инжектируется из сервиса (как у `Texts`/`TextBlock`); domain-параметры
(`size`, `textureMap`) приходят из конфига, display-параметры (`anchor`, `x`, `y`, …)
применяются `applyDisplayProperties`.

---

## Конфиг (slotObjects / children)

```json
{
  "type": "ImageNumbers",
  "name": "multiplier",
  "size": 110,
  "anchor": [0.5, 0.5]
}
```

| Поле | Тип | Назначение |
|---|---|---|
| `size` | number | целевая высота глифа в px (`null`/отсутствует — натуральный размер) |
| `anchor` | `[x, y]` | групповой anchor (0 — край у origin, 0.5 — центр, 1 — противоположный край) |
| `textureMap` | object | переопределение карты `char → alias` (по умолчанию 0-9, `.`→`dot`, `x`/`X`→`x`) |

> Дефолтный `textureMap` предполагает, что в `resources` есть алиасы `"0".."9"`, `"dot"`, `"x"`.
> Для других наборов глифов передайте свой `textureMap`.

---

## Runtime API

```javascript
const badge = symbol.find("multiplier");
badge.setValue("2X");      // строка как есть
badge.setValue(10.5, 1);   // число → "10.5"
badge.setSize(120);        // перемасштабировать и перерисовать
```

---

## Сравнение glyph-/bitmap-типов

| Свойство | ImageNumbers | BitmapFont | BitmapText |
|---|---|---|---|
| Источник глифов | спрайт-текстуры по `textureMap` | спрайты `fontName_char` | bitmap-шрифт (PIXI) |
| Карта символов | настраиваемая (`textureMap`) | фикс. конвенция `fontName_char` | — (шрифт) |
| Масштаб под высоту (`size`) | + | - | через `style` |
| Групповой `anchor` | + | - | через anchor у Text |
| Форматирование чисел | `setValue(n, decimals)` | - | - |
| API установки значения | `setValue` / `setSize` | `setText` | `.text` |
```
