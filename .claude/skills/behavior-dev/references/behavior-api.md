# Behavior System — Full API Reference

## Table of Contents

1. [LayoutController API](#layoutcontroller-api)
2. [Behavior Attachment Flow](#behavior-attachment-flow)
3. [GameConfig.behaviors Format](#gameconfigbehaviors-format)
4. [State Sync Mechanism](#state-sync-mechanism)
5. [Access Patterns](#access-patterns)
6. [Figma Component Structure Guide](#figma-component-structure-guide)
7. [Figma Export Pipeline](#figma-export-pipeline)

---

## LayoutController API

**Location:** `modules/engine/common/LayoutController.js`

```javascript
class LayoutController {
    constructor(layout, options = {})  // stores layout/options, calls init()

    // Override points
    init() {}                          // setup — find children, connect signals
    onEnabledChange(value) {}          // called when enabled toggled
    onDestroy() {}                     // custom cleanup

    // Tree queries (delegate to layout)
    get(name)                          // immediate child by name
    find(name)                         // recursive search
    findAll(name)                      // all matching
    forAll(name|array, callback)       // apply to all matches

    // Signal management (auto-cleanup on destroy)
    connectSignal(signal, handler)     // subscribe, returns connection
    connectButton(buttonName, signal)  // find button, wire onPress → signal
    connectChange(buttonName, signal)  // find button, wire onChange → signal

    // UI utilities
    setVisible(name|array, visible)    // toggle visibility by name
    setEnabled(name|array, enabled)    // toggle enabled by name

    // Enabled state
    get enabled()                      // boolean
    set enabled(value)                 // triggers onEnabledChange

    // State sync (for ScreenLayout variant switching)
    getState()                         // return {} by default
    setState(state)                    // no-op by default

    // Lifecycle
    destroy()                          // disconnects all signals, nulls layout
}
```

### Properties

| Property | Type | Description |
|---|---|---|
| `layout` | BaseContainer | The container this behavior is attached to |
| `options` | Object | Config options from GameConfig (everything except `Behavior`) |
| `enabled` | boolean | Enable/disable the controller |

### Signal Connection Patterns

```javascript
// Connect to a typed-signal (auto-disconnects on destroy)
this.connectSignal(button.onPress, () => this.handlePress());

// Connect all buttons with given name to a signal
this.connectButton("CloseBtn", this.onClose);  // finds by name, wires onPress

// Connect all toggles with given name
this.connectChange("SoundToggle", this.onSoundChange);  // wires onChange
```

---

## Behavior Attachment Flow

```
Game.start(GameConfig)
  → ServicesConfig → LayoutBuilder(params)
    → this.behaviorsConfig = gameConfig.behaviors

LayoutBuilder.buildLayout(config)
  → build display object tree
  → applyProperties(displayObject, props)
  → #attachBehavior(displayObject, config)     ← HERE
    → Guard: displayObject.addComponent exists? (BaseContainer only)
    → Guard: displayObject._behavior already set?
    → behaviorKey = config.isInstance ? config.type : config.name
    → entry = behaviorsConfig[behaviorKey]
    → new BehaviorCls(displayObject, behaviorOptions)
    → displayObject._behavior = behavior
    → displayObject.addComponent(behavior)
  → return displayObject
```

### Key Points

- **Single attachment point:** `#attachBehavior` is called only in `buildLayout()`, after properties are applied
- **Guard against non-BaseContainer:** Checks for `addComponent` method
- **Guard against double-attach:** Checks `displayObject._behavior` (prevents re-attach in recursive builds)
- **Key resolution:** Regular objects use `config.name`, instances use `config.type`
- **Component lifecycle:** `addComponent()` registers behavior for `step()`, `onScreenResize()`, and `destroy()`

---

## GameConfig.behaviors Format

```javascript
behaviors: {
    [componentTypeKey]: {
        Behavior: LayoutControllerSubclass,  // required — the class
        ...options                           // all other keys → this.options
    }
}
```

### Key Matching Rules

| Scenario | Config property | Behavior key |
|---|---|---|
| Named component | `config.name` | Component name from Figma |
| Instance of component | `config.type` | Component **type** name |
| Multiple instances of same type | `config.type` | All get same behavior class |

**Example:** If Figma has a component type `TabsPanel` and three instances named `SettingsTabs`, `InfoTabs`, `ShopTabs`:
- Key `TabsPanel` → all three get the behavior (matched by type)
- Key `SettingsTabs` → only that instance gets the behavior (matched by name, only for non-instance configs)

**Recommendation:** Use the component **type name** as the key. This ensures all instances of that component type get the behavior automatically.

---

## State Sync Mechanism

When ScreenLayout switches variants (portrait ↔ landscape):

```
ScreenLayout.setMode(newMode)
  → previousLayout = old layout tree
  → activeLayout = new layout tree

  → #collectBehaviors(previousLayout)    // walk tree, collect Map<label, behavior>
  → #collectBehaviors(activeLayout)

  → for each (label, prevBehavior) in prevBehaviors:
      newBehavior = newBehaviors.get(label)
      if both have getState/setState:
          newBehavior.setState(prevBehavior.getState())

  → emit onLayoutChange signal
```

### Requirements for State Sync

1. Both variants must have a container with the **same `label`** (set from `name` in config)
2. Both containers must have `_behavior` attached
3. Behavior must implement `getState()` returning meaningful state
4. Behavior must implement `setState(state)` restoring that state

### Example

```javascript
// Before switch: portrait variant, tabs at index 2
getState() → { activeIndex: 2 }

// After switch to landscape:
setState({ activeIndex: 2 })
  → this.setActive(2)
  → landscape tabs now show page 2
```

### When State Sync Is Not Needed

- Component only has one variant (no ScreenLayout)
- Behavior has no meaningful state (e.g., hover animation)
- State should reset on variant change (leave default `getState() { return {}; }`)

---

## Access Patterns

### From Scene

```javascript
class SettingsScene extends Scene {
    create() {
        // findBehavior searches layout.find(query) then this.find(query)
        const tabs = this.findBehavior("SettingsTabs");
        tabs.onChange.connect(index => { /* ... */ });
        tabs.setActive(0);
    }
}
```

### From Flow

```javascript
async function settingsFlow(scope, ctx) {
    const scene = ctx.scenes.get("SettingsScene");
    const tabs = scene.findBehavior("SettingsTabs");

    scope.on(tabs.onChange, index => { /* react */ });
    await scope.wait(tabs.onChange);  // wait for tab switch
}
```

### Direct Container Access

```javascript
const container = layout.find("SettingsTabs");
const behavior = container.behavior;  // getter on BaseContainer
```

---

## Figma Component Structure Guide

### General Rules

1. **Component type name = behavior key.** The Figma component name (not instance name) maps to `GameConfig.behaviors` key.

2. **Named children = behavior's API.** The behavior finds children by `label` (which comes from Figma name). These names are a contract between designer and developer.

3. **Consistent names across variants.** Each variant (portrait/landscape/default) must use identical child names. Layout can differ, names cannot.

4. **Children order matters for index-based behaviors.** Tabs, pagination, and similar behaviors iterate `children` by index. The order of children in Figma determines the order in the behavior.

### Recommended Structures

#### Tabs Component
```
MyTabs (Component Set)
├── default (Variant)
│   ├── NavTabs (AutoLayout, horizontal)
│   │   ├── Tab1 (Button instance)
│   │   ├── Tab2 (Button instance)
│   │   └── Tab3 (Button instance)
│   └── Content (Frame)
│       ├── Page1 (Frame)
│       ├── Page2 (Frame)
│       └── Page3 (Frame)
├── portrait (Variant)
│   ├── NavTabs (AutoLayout, vertical)   ← same name, different layout
│   │   ├── Tab1, Tab2, Tab3
│   └── Content (Frame)
│       ├── Page1, Page2, Page3
```

#### Toggle Group
```
SoundSettings (Component)
├── Options (AutoLayout)
│   ├── SFXToggle (Toggle instance)
│   ├── MusicToggle (Toggle instance)
│   └── AmbientToggle (Toggle instance)
```

#### Accordion
```
InfoAccordion (Component)
├── Sections (AutoLayout, vertical)
│   ├── Section1 (Frame)
│   │   ├── Header1 (Button instance)
│   │   └── Body1 (Frame, hidden by default)
│   ├── Section2 (Frame)
│   │   ├── Header2 (Button instance)
│   │   └── Body2 (Frame, hidden by default)
```

### What NOT to Do in Figma

- **Don't use `_ph` suffix** for behavior children — `_ph` is reserved for scene mount placeholders
- **Don't rename children between variants** — breaks state sync
- **Don't nest the behavior target too deep** — `find()` searches recursively, but the behavior key matches at the component level, not deep children
- **Don't use identical names for siblings** — `find()` returns the first match

---

## Figma Export Pipeline

### How Components Become Config

```
Figma Component
  → npm run export
  → NodeProcessor checks componentRegistry
    → Special processor found? → Use it (extracts specific children)
    → No special processor? → Generic extraction (children as array)
  → components.config.json
```

### When You Need a Special Processor

Most behaviors work with generic export — the behavior finds children at runtime via `this.find()`. You only need a special processor when:

- The component has specific children that must become **top-level config properties** (not nested in `children` array)
- The component needs computed values from Figma (e.g., spacing from auto-layout)
- The component's type in config must differ from its Figma structure

For special processors, see the `component-dev` skill and `tools/figma/src/handlers/special/specialProcessors.ts`.

### Generic Export Result

```json
{
    "name": "SettingsTabs",
    "type": "BaseContainer",
    "variants": {
        "default": {
            "children": [
                { "name": "NavTabs", "type": "BaseContainer", "children": [...] },
                { "name": "Content", "type": "BaseContainer", "children": [...] }
            ]
        },
        "portrait": {
            "children": [
                { "name": "NavTabs", "type": "BaseContainer", "children": [...] },
                { "name": "Content", "type": "BaseContainer", "children": [...] }
            ]
        }
    }
}
```

The behavior is **not** in the config — it's attached at runtime by LayoutBuilder based on `GameConfig.behaviors`.
