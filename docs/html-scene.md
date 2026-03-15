# HTMLScene

DOM-based scene alternative to the PIXI `Scene` class. Use it when you need native HTML elements (selects, inputs, sliders, text panels) rendered on top of the canvas.

---

## When to use

- Native HTML form controls (dropdowns, checkboxes, range sliders)
- Debug/dev-tool overlays
- Text-heavy panels where DOM layout is simpler than PIXI text
- Any UI that benefits from CSS styling, scrolling, or accessibility features

For game UI that needs to match Figma layout configs and integrate with ScreenLayout/behaviors, use the regular `Scene`.

---

## API

### Constructor

```js
new HTMLScene({ name, services, ...options })
```

| Param | Description |
|---|---|
| `name` | Scene label (defaults to `constructor.name`) |
| `services` | ServiceLocator instance — used to subscribe to resize events |
| `...options` | Forwarded to `create(options)` |

The constructor:
1. Creates a root `<div>` with `position:absolute; inset:0; pointer-events:none; display:none`
2. Appends it to `.canvas-box` (the container that holds the PIXI canvas)
3. Subscribes to `resizeSystem.onResize` if available
4. Calls `create(options)`

### Lifecycle methods

| Method | Description |
|---|---|
| `create(options)` | Override to build DOM content. Called once from constructor. |
| `show()` | Sets `visible = true`, removes `display:none` from root. |
| `hide()` | Sets `visible = false`, sets `display:none` on root. |
| `destroy()` | Unsubscribes from resize, removes root element from DOM. |
| `onResize(context)` | Override to handle viewport resize. Receives resize context from `resizeSystem`. |

### Properties

| Property | Type | Description |
|---|---|---|
| `label` | `string` | Scene name identifier |
| `services` | `ServiceLocator` | Access to engine services |
| `visible` | `boolean` | Current visibility state |
| `root` | `HTMLDivElement` | Root DOM element, append your content here |

---

## SceneManager integration

HTMLScene works with `SceneManager.add()` / `show()` / `hide()` / `remove()` like any scene. The key difference: SceneManager guards `addChild` with a type check:

```js
if (typeof root.addChild === "function" && typeof scene.addChild === "function") {
    root.addChild(scene);
}
```

Since HTMLScene has no `addChild` method, it skips the PIXI display tree entirely. The scene lives in the DOM, not in the PIXI scene graph. SceneManager still tracks it by name, so `scenes.get()`, `scenes.show()`, `scenes.hide()`, and `scenes.remove()` all work normally.

HTMLScene does **not** support declarative `children` config (placeholder mounting) since it has no PIXI layout.

---

## Pointer-events strategy

The root element has `pointer-events: none` so it does not block interaction with the PIXI canvas underneath. Set `pointer-events: auto` on specific interactive children via CSS:

```css
[data-scene="MyOverlay"] .panel {
    pointer-events: auto;  /* clickable */
}
```

This lets canvas events pass through empty areas while HTML controls remain interactive.

---

## CSS injection pattern

Define styles as a module-level string constant, scoped with `[data-scene="YourSceneName"]` to avoid collisions. Inject a `<style>` element in `create()` and remove it in `destroy()`:

```js
const CSS = `
[data-scene="MyOverlay"] .panel {
    position: absolute;
    right: 0; top: 0; bottom: 0;
    width: 300px;
    background: rgba(0, 0, 0, 0.85);
    color: #fff;
    pointer-events: auto;
    overflow-y: auto;
    padding: 16px;
    box-sizing: border-box;
}
[data-scene="MyOverlay"] .panel select {
    width: 100%; padding: 6px; background: #333; color: #fff;
    border: none; border-radius: 4px;
}
`;
```

The `data-scene` attribute is set automatically by HTMLScene from `this.label`, so your selectors always match the correct root.

---

## Example: simple overlay scene

```js
import { Signal } from "typed-signals";
import { HTMLScene } from "onearm";

const CSS = `
[data-scene="DebugOverlay"] .debug-panel {
    position: absolute;
    left: 8px; top: 8px;
    background: rgba(0, 0, 0, 0.8);
    color: #0f0;
    font: 12px monospace;
    padding: 8px 12px;
    border-radius: 4px;
    pointer-events: auto;
}
[data-scene="DebugOverlay"] .debug-panel select {
    background: #222; color: #0f0; border: 1px solid #0f0;
    margin-left: 8px;
}
`;

export class DebugOverlay extends HTMLScene {
    create() {
        this.onModeChange = new Signal();

        // Inject styles
        this._style = document.createElement("style");
        this._style.textContent = CSS;
        document.head.appendChild(this._style);

        // Build DOM
        const panel = document.createElement("div");
        panel.className = "debug-panel";
        panel.innerHTML = `
            <label>Render mode
                <select data-id="mode">
                    <option>normal</option>
                    <option>wireframe</option>
                </select>
            </label>
            <div data-id="fps"></div>
        `;
        this.root.appendChild(panel);

        // Cache elements
        this._fps = panel.querySelector('[data-id="fps"]');
        const modeSelect = panel.querySelector('[data-id="mode"]');
        modeSelect.addEventListener("change", () => {
            this.onModeChange.emit(modeSelect.value);
        });
    }

    setFPS(value) {
        this._fps.textContent = `FPS: ${value}`;
    }

    destroy() {
        this._style?.remove();
        super.destroy();
    }
}
```

Register in GameConfig and use from flow like any other scene:

```js
// GameConfig.js
scenes: {
    DebugOverlay,
    // ...
}

// flow
const overlay = await scenes.show("DebugOverlay");
overlay.setFPS(60);
overlay.onModeChange.connect((mode) => console.log(mode));
```

---

## Checklist: creating an HTMLScene

1. Extend `HTMLScene`, override `create()` to build your DOM tree
2. Define CSS as a module constant, scoped with `[data-scene="YourName"]`
3. Inject `<style>` in `create()`, remove in `destroy()` (call `super.destroy()`)
4. Set `pointer-events: auto` only on interactive elements
5. Use `data-id` attributes + `querySelectorAll` to cache element references
6. Expose signals for user actions, methods for state updates (same pattern as PIXI scene controllers)
7. Override `onResize(context)` if your layout needs to respond to viewport changes
