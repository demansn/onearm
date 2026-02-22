# Layout System — Full API Reference

## Layout Class

**Location**: `modules/engine/common/layout/Layout.js`

Extends PIXI Container. Two positioning modes.

### Auto Mode

```js
new Layout({
    mode: "auto",
    flow: "horizontal",          // "horizontal" | "vertical"
    gap: { x: 10, y: 5 },       // spacing between children
    wrap: true,                  // wrap to next line (or number = max items per line)
    contentAlign: { x: "center", y: "center" },  // align content within container
    spaceBetween: true,          // distribute space equally between items
    areaAlign: { x: "center", y: "center" },      // align entire layout block
    size: { width: 800, height: 600 },
});
```

- `contentAlign.x`: `"left"`, `"center"`, `"right"`, or `"50%"`
- `contentAlign.y`: `"top"`, `"center"`, `"bottom"`, or `"50%"`
- When `spaceBetween: true`, gap is ignored and items spread across available space
- `wrap: true` wraps when exceeding container size; `wrap: 3` wraps every 3 items

### Manual Mode

```js
new Layout({ mode: "manual", size: { width: 1920, height: 1080 } });

child.display = {
    align: { x: "center", y: "top" },     // named position
    offset: { top: 50, left: 20 },         // fine-tuning
};
// offset keys: x, y, left, right, top, bottom, centerX, centerY
```

### Methods

```js
layout.layout()                  // force recalculate
layout.setSize(width, height)    // resize container
layout.size                      // getter: { width, height }
layout.addChild(a, b, c)         // adds and auto-relayouts
```

---

## ScreenLayout

**Location**: `modules/engine/common/displayObjects/ScreenLayout.js`

Manages multiple Layout trees for different screen orientations.

### Created automatically by Scene/LayoutBuilder when config has variants

```js
// components.config.json
{
    "name": "HUDLayout",
    "variants": {
        "default": { "children": [...] },
        "portrait": { "children": [...] },
        "landscape": { "children": [...] }
    }
}
```

### API

```js
screenLayout.setMode(mode)        // "default" | "portrait" | "landscape" | "desktop"
screenLayout.mode                  // current mode string
screenLayout.current               // current active Layout instance
screenLayout.availableModes        // array of mode names

screenLayout.get(query)            // find in current layout only
screenLayout.find(query)           // alias for get
screenLayout.findAll(query)        // find across ALL layouts
screenLayout.forAll(query, fn)     // apply fn to matching in ALL layouts
screenLayout.forAllInCurrentLayout(query, fn)  // apply in current only

screenLayout.onLayoutChange        // Signal — fires when mode switches
```

---

## LayoutSystem Service

**Location**: `modules/engine/services/LayoutSystem.js`

Automatically repositions objects with `displayConfig` on resize.

### displayConfig properties

```js
object.displayConfig = {
    x: "50%",                  // position (number, "50%", "100px")
    y: "90%",
    scale: 1.0,                // uniform scale
    anchor: [0.5, 0.5],        // PIXI anchor
    pivot: { x: 0.5, y: 0.5 },
    zone: "game",              // basis zone
};
```

### Zone types

| Zone | Key | Description |
|------|-----|-------------|
| Full screen | `"fullScreen"` | Entire viewport |
| Safe area | `"save"` | Avoids notches/bezels |
| Game area | `"game"` | Design resolution area |
| Parent | `"parent"` | Parent container bounds |

### Zone context structure (from ResizeSystem)

```js
{
    mode: "portrait",  // "portrait" | "landscape" | "desktop"
    zone: {
        fullScreen: { width, height, left, top, right, bottom, center: { x, y } },
        game:       { width, height, left, top, right, bottom, center: { x, y } },
        save:       { width, height, left, top, right, bottom, center: { x, y } },
    },
    scale: 1.5,
    resolution: { width: 1920, height: 1080 },
}
```

### Manual update

```js
import services from "onearm";
services.layoutSystem.updateObject(myObject);  // force re-apply displayConfig
```

---

## LayoutBuilder Service

**Location**: `modules/engine/services/LayoutBuilder.js`

Reads `components.config.json` and builds display trees.

### API

```js
const layouts = services.get("layouts");

layouts.build("HUDLayout");                    // build for current mode
layouts.buildScreenLayout("HUDLayout");        // build ScreenLayout (all variants)
layouts.getConfig("HUDLayout");                // get raw config object
layouts.hasMultipleVariants("HUDLayout");       // check if needs ScreenLayout
```

### Supported component types in config

| Type | Description |
|------|-------------|
| `ComponentContainer` | Generic container with children |
| `AnimationButton` | Button with hover/press animation |
| `CheckBoxComponent` | Toggle checkbox |
| `ValueSlider` | Slider with discrete steps |
| `DotsGroup` | Dot indicators (e.g., page dots) |
| `ProgressBar` | Progress visualization |
| `ScrollBox` | Scrollable container |
| `VariantsContainer` | Container that switches between child variants |
| `ZoneContainer` | Container sized to a screen zone |
| `FullScreenZone` | ZoneContainer for fullScreen zone |
| `SaveZone` | ZoneContainer for safe area zone |

### Config child with instance reference

```json
{
    "name": "betPanel",
    "isInstance": true,
    "properties": { "x": 100 }
}
```
`isInstance: true` means "look up 'betPanel' in components config and build it".

---

## ZoneContainer

**Location**: `modules/engine/common/displayObjects/ZoneContainer.js`

Layout container that auto-sizes to a screen zone on resize:

```js
import { ZoneContainer } from "onearm";

const overlay = new ZoneContainer({ zoneName: "fullScreen" });
// On resize: overlay.setSize(zone.fullScreen.width, zone.fullScreen.height)
// overlay.x = zone.fullScreen.left; overlay.y = zone.fullScreen.top;
```

Subclasses: `FullScreenZone` (zoneName="fullScreen"), `SaveZone` (zoneName="save").

---

## ObjectFactory

**Location**: `modules/engine/common/core/ObjectFactory.js`

### Registration

```js
import { ObjectFactory } from "onearm";

// Register by constructor (most common)
ObjectFactory.registerObjectConstructor("WinCounter", WinCounterClass);

// Register factory function (for complex creation)
ObjectFactory.registerObjectFactory("CustomWidget", (props) => {
    const widget = new CustomWidget();
    widget.configure(props);
    return widget;
});

// Register multiple at once
ObjectFactory.registerObjectConstructors({ WinCounter, BetDisplay, PaylineOverlay });
```

### Usage

```js
// By registered name
const counter = container.createObject("WinCounter", { x: 100, y: 50 });

// By class reference (no registration needed)
const counter = container.createObject(WinCounterClass, { x: 100, y: 50 });

// createObject adds to parent; buildDisplayObject does not
const detached = container.objectFactory.buildDisplayObject("Sprite", { texture: "bg" });
```

### Fallback chain
1. Registered factory by name
2. Sprite (if matching texture exists)
3. Text (if no texture match)

---

## BaseContainer

**Location**: `modules/engine/common/core/BaseContainer.js`

Base class for all game display objects. Extends PIXI Container.

### Tree search (dot-notation)

```js
container.find("Panel.Header.Title")   // deep search by label chain
container.get("SpinButton")            // alias for find
container.findAll("symbol")            // all children named "symbol"
container.forAll("Button", btn => btn.enabled = false)
```

### Object creation

```js
container.createObject("Sprite", { texture: "bg", x: 0, y: 0 });
container.createObject(MyClass, { param: "value" });
container.addObject("Text", { text: "Hello", style: "Default" });
```

### Components (behavior system)

```js
container.addComponent(new MyComponent());
container.getComponent("MyComponent");
// Components receive step(event) calls each frame
```

### Other

```js
container.setTint(0xFF0000);     // tint all children
container.restoreTint();
container.buildLayout(config);   // build layout from config object
container.addToPlaceholder("slotName", child);  // add to named placeholder
```

---

## Scene

**Location**: `modules/engine/services/sceneManager/Scene.js`

Extends BaseContainer. Adds:

```js
class Scene extends BaseContainer {
    constructor({ name, layer }) {}  // layer = GameLayers key

    create(options) {}     // override for custom init
    show() {}              // set visible = true
    hide() {}              // set visible = false

    getPressSignal(query)  // shortcut: find(query).onPress
    getObject(query)       // alias for find
}
```

If a layout config with the same name as the scene exists in components.config,
`buildLayout(name)` is called automatically in the constructor.
Result stored in `this.layout`.

---

## ResizeSystem Service

**Location**: `modules/engine/services/ResizeSystem.js`

### Modes
- `"desktop"` — 1920x1080 base
- `"landscape"` — mobile landscape
- `"portrait"` — mobile portrait

### API

```js
const resize = services.get("resizeSystem");

resize.getContext()              // current { mode, zone, scale, resolution }
resize.onResized                 // Signal<context>
resize.mode                      // current mode string
resize.update()                  // force recalculate
```

### Handling in display objects

```js
onScreenResize(event) {
    // event has same structure as getContext()
    if (event.mode === "portrait") { /* ... */ }
}
```

---

## GameLayers Service

**Location**: `modules/engine/services/GameLayers.js`

```js
const layers = services.get("layers");
layers.get("ui");         // PIXI RenderLayer
layers.default;           // dot access

// Configured in GameConfig:
layers: { layers: ["background", "main", "reels", "ui", "overlay"] }
```

Objects assigned to layers render in layer order regardless of parent hierarchy.
