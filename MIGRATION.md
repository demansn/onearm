# Migration Guide: Engine v0.5 (Architecture Refactoring)

## Overview

Engine v0.5 restructures `modules/engine/common/` for simplicity and consistency:

- **7 deprecated classes removed**, replaced by 5 unified classes
- **God-object pattern eliminated** (SuperContainer static fields → EngineContext)
- **3 buttons → 1**, **4 layout containers → 1**, **3 sliders → 1**

### New structure

```
common/
├── core/
│   ├── EngineContext.js    # Global engine state (replaces SuperContainer statics)
│   ├── BaseContainer.js    # Base class for all display objects (replaces SuperContainer)
│   └── ObjectFactory.js    # Object creation registry (replaces Mather)
├── layout/
│   └── Layout.js           # Unified layout container (replaces AutoLayout + FlexContainer)
├── unified/
│   ├── Button.js           # Unified button (replaces Button + AnimationButton)
│   └── Slider.js           # Unified slider (replaces CustomSlider + ValueSlider)
├── displayObjects/         # (unchanged)
└── UI/                     # (unchanged, uses BaseContainer internally)
```

---

## Breaking Changes

### 1. SuperContainer → BaseContainer

**Before:**
```js
import { SuperContainer } from "engine/common/displayObjects/SuperContainer.js";

class MyComponent extends SuperContainer {
    constructor() {
        super();
        // Access via static fields:
        SuperContainer.textures;
        SuperContainer.styles;
        SuperContainer.layers;
    }
}
```

**After:**
```js
import { BaseContainer } from "engine/common/core/BaseContainer.js";
// or
import { BaseContainer } from "engine/index.js";

class MyComponent extends BaseContainer {
    constructor() {
        super();
        // Static fields removed. Use services or EngineContext if needed:
        // import { getEngineContext } from "engine/common/core/EngineContext.js";
        // const ctx = getEngineContext();
    }
}
```

API is identical — `find()`, `get()`, `findAll()`, `forAll()`, `createObject()`, `addObject()`, `step()`, `onScreenResize()`, `destroy()`, `setTint()`, `restoreTint()`, `components` all work the same.

The `mather` getter still works as backward-compat alias for `factory`.

### 2. Mather → ObjectFactory

**Before:**
```js
import { Mather } from "engine/common/displayObjects/Mather.js";

Mather.registerObjectFactory("MyWidget", (opts) => new MyWidget(opts));
Mather.registerObjectConstructor("MyClass", MyClass);
```

**After:**
```js
import { ObjectFactory } from "engine/common/core/ObjectFactory.js";
// or
import { ObjectFactory } from "engine/index.js";

ObjectFactory.registerObjectFactory("MyWidget", (opts) => new MyWidget(opts));
ObjectFactory.registerObjectConstructor("MyClass", MyClass);
```

API is identical — only the class name and import path changed.

### 3. AutoLayout → Layout (mode: "auto")

**Before:**
```js
import { AutoLayout } from "engine/common/displayObjects/AutoLayout.js";

class MyPanel extends AutoLayout {
    constructor() {
        super({
            flow: "horizontal",
            gap: 10,
            contentAlign: { x: "center", y: "center" },
        });
    }
}
```

**After:**
```js
import { Layout } from "engine/common/layout/Layout.js";
// or
import { Layout } from "engine/index.js";

class MyPanel extends Layout {
    constructor() {
        super({
            mode: "auto",  // default, can be omitted
            flow: "horizontal",
            gap: 10,
            contentAlign: { x: "center", y: "center" },
        });
    }
}
```

`mode: "auto"` is the default, so you can omit it. All AutoLayout options (`flow`, `gap`, `wrap`, `contentAlign`, `spaceBetween`, `areaAlign`) work identically.

### 4. FlexContainer → Layout (mode: "manual")

**Before:**
```js
import { FlexContainer } from "engine/common/displayObjects/FlexContainer.js";

class MyScreen extends FlexContainer {
    constructor() {
        super({ size: { width: 800, height: 600 } });
    }
}
```

**After:**
```js
import { Layout } from "engine/common/layout/Layout.js";
// or
import { Layout } from "engine/index.js";

class MyScreen extends Layout {
    constructor() {
        super({
            mode: "manual",
            size: { width: 800, height: 600 },
        });
    }
}
```

All FlexContainer options (`size`, `areaAlign`, child `display` property with `align`/`offset`) work identically.

### 5. ComponentContainer → BaseContainer

Direct replacement, no changes needed:

```js
// Before
import { ComponentContainer } from "engine/common/displayObjects/ComponentContainer.js";
// After
import { BaseContainer } from "engine/common/core/BaseContainer.js";
```

### 6. AnimationButton → Button

**Before:**
```js
import { AnimationButton } from "engine/common/UI/AnimationButton.js";

new AnimationButton({ image: "btn_spin" });
```

**After:**
```js
import { Button } from "engine/common/unified/Button.js";
// or
import { Button } from "engine/index.js";

new Button({
    image: "btn_spin",
    animation: { hover: 1.03, press: 0.95 },
    sounds: { press: "button_click", hover: "button_hover" },
});
```

The unified Button supports 4 modes:
- **name**: `new Button({ name: "spin" })` — looks up `spin_btn_default/hover/pressed/disabled` textures
- **template**: `new Button({ template: "btn_[state]_bg" })` — pattern-based texture names
- **image**: `new Button({ image: "btn_spin", animation: {...} })` — single texture with scale animation
- **views**: `new Button({ views: { defaultView, hoverView, ... } })` — explicit FancyButton views

Additional options: `text`, `textStyle`, `sounds`, `disabledStyle`, `onClick`, `disabled`.

### 7. ValueSlider → Slider

**Before:**
```js
import { ValueSlider } from "engine/common/UI/ValueSlider.js";

const slider = new ValueSlider();
slider.init({ steps: [0.5, 1, 2, 5, 10] });
```

**After:**
```js
import { Slider } from "engine/common/unified/Slider.js";
// or
import { Slider } from "engine/index.js";

const slider = new Slider();
slider.init({ steps: [0.5, 1, 2, 5, 10] });
```

The unified Slider supports two modes:
- **Direct**: pass `bg`, `fill`, `slider` objects in constructor
- **Layout**: call `init()` after children are added (finds `SliderBG`, `SliderFill`, `SliderBtn` by name)

Signals: `onUpdate` (during drag), `onChange` (on release).

### 8. Old Button (UI/Button.js) → unified Button

The old `Button` from `common/UI/Button.js` (extending FancyButton directly) is no longer exported from `engine/index.js`. Use the unified Button instead.

**Before:**
```js
import { Button } from "engine/index.js"; // was old FancyButton wrapper

new Button({ name: "spin", onClick: () => {} });
```

**After:**
```js
import { Button } from "engine/index.js"; // now unified Button

new Button({ name: "spin", onClick: () => {} });
```

The constructor API is compatible — `name`, `template`, `onClick` all work the same.

---

## Layout Config Compatibility

String type names used in layout JSON configs continue to work:

| Layout config type      | Creates                                      |
|------------------------|----------------------------------------------|
| `"AutoLayout"`         | `Layout` with `mode: "auto"`                 |
| `"FlexContainer"`      | `Layout` with `mode: "manual"`               |
| `"ComponentContainer"` | `BaseContainer`                               |
| `"AnimationButton"`    | `Button` with default animation and sounds   |
| `"SuperContainer"`     | `BaseContainer` (with resize context)         |

No changes needed in layout JSON files.

---

## Deleted Files

| Removed file                                     | Replacement                        |
|-------------------------------------------------|-------------------------------------|
| `common/displayObjects/SuperContainer.js`        | `common/core/BaseContainer.js`      |
| `common/displayObjects/Mather.js`                | `common/core/ObjectFactory.js`      |
| `common/displayObjects/AutoLayout.js`            | `common/layout/Layout.js`           |
| `common/displayObjects/FlexContainer.js`         | `common/layout/Layout.js`           |
| `common/displayObjects/ComponentContainer.js`    | `common/core/BaseContainer.js`      |
| `common/UI/AnimationButton.js`                   | `common/unified/Button.js`          |
| `common/UI/ValueSlider.js`                       | `common/unified/Slider.js`          |
| `common/displayObjects/SpineComponent.js`        | (was empty, deleted)                |

---

## Quick Migration Checklist

1. Find & replace imports:
   - `SuperContainer` → `BaseContainer` (from `core/BaseContainer.js`)
   - `Mather` → `ObjectFactory` (from `core/ObjectFactory.js`)
   - `AutoLayout` → `Layout` (from `layout/Layout.js`)
   - `FlexContainer` → `Layout` (from `layout/Layout.js`, add `mode: "manual"`)
   - `ComponentContainer` → `BaseContainer`
   - `AnimationButton` → `Button` (from `unified/Button.js`, add `animation` + `sounds`)
   - `ValueSlider` → `Slider` (from `unified/Slider.js`)

2. For `FlexContainer` subclasses: add `mode: "manual"` to constructor options

3. For `AnimationButton` usages: add `animation: { hover: 1.03, press: 0.95 }` and `sounds: { press: "button_click", hover: "button_hover" }` to options

4. Remove any references to `SuperContainer.textures`, `SuperContainer.styles`, etc. — use `getEngineContext()` or services instead

5. Verify build: `npm run dev -- -game=sandbox`
