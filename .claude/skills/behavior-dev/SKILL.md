---
name: behavior-dev
description: |
  Skill for creating components with auto-attached behaviors on the onearm engine.
  Covers the full pipeline: Figma component structure → export → GameConfig.behaviors → Behavior class.
  Use this skill whenever the user wants to: create a behavior for a component, add interactive behavior
  to a layout component, design a Figma component that will have a behavior, structure a component
  for tabs/accordion/toggle/pagination/carousel behavior, understand how behaviors attach to components,
  configure GameConfig.behaviors, create a LayoutController subclass for auto-attachment.
  Trigger on any mention of: behavior, GameConfig.behaviors, auto-attach, LayoutController subclass,
  component behavior, tabs behavior, accordion, toggle group, interactive component, findBehavior,
  container.behavior, getState setState sync, behavior for Figma component, component with logic,
  behavior system, attach behavior. Also trigger when the user wants to add interactivity to a
  layout component without manual wiring in the scene, or when they ask how to structure a Figma
  component so it works well with a behavior. Even if the user just says "make this component
  interactive" or "add tabs to settings" — this skill should be consulted.
---

# Behavior Development — Components with Auto-Attached Behaviors

You help create components with behaviors on the onearm engine. A behavior is a `LayoutController` subclass that gets automatically created and attached to a component during layout building — no manual wiring in the scene needed.

For the full API reference and Figma structure guide, read `references/behavior-api.md`.

## When to Use Behaviors

Behaviors are for **reusable UI logic bound to a component type**, not to a specific scene.

| Use Behavior | Use Scene Controller |
|---|---|
| Tabs, accordion, toggle group, pagination | Game-specific HUD logic |
| Hover/press animations on a panel | Spin button state management |
| Auto-scrolling carousel | Win presentation orchestration |
| Form validation within a component | Cross-component coordination |

**Rule of thumb:** If the logic is about "how this component works internally" → behavior. If it's about "what the game does with this component" → scene controller or flow.

## Workflow

### Step 1: Design the Figma Component

The Figma component structure determines what the behavior can access via `this.find()`. Design it with named children that the behavior will control.

**Naming rules:**
- Component type name = the key in `GameConfig.behaviors` (e.g., `SettingsTabs`)
- Internal children = named elements the behavior finds (e.g., `NavTabs`, `Content`)
- Each variant (portrait/landscape/default) must have the **same child names** for state sync to work
- Use `_ph` suffix only for scene placeholders, not for behavior children

**Example Figma structure for tabs:**
```
SettingsTabs (Component)          ← behavior key
├── NavTabs (AutoLayout)          ← behavior finds this
│   ├── Tab1 (Button)
│   ├── Tab2 (Button)
│   └── Tab3 (Button)
├── Content (Frame)               ← behavior finds this
│   ├── Page1 (Frame)
│   ├── Page2 (Frame)
│   └── Page3 (Frame)
└── Indicator (Rectangle)         ← optional: behavior can animate this
```

**Key principle:** The behavior finds children by name, so Figma child names ARE the behavior's API contract. If the designer renames `NavTabs` to `Navigation`, the behavior breaks. Document this.

**Variant consistency:** If the component has portrait/landscape variants, each variant must contain the same named children. The visual arrangement can differ, but child names must match — ScreenLayout syncs behavior state by matching `label` across variants.

### Step 2: Export from Figma

```bash
npm run export
```

The component appears in `components.config.json`. If the component needs special export handling (extracting specific children as properties), register it in the component pipeline — see the `component-dev` skill for details.

For most behaviors, **generic export is sufficient** — the behavior finds children at runtime via `this.find()`, so no special extraction is needed. The standard BaseContainer with children export works.

### Step 3: Create the Behavior Class

```javascript
import { LayoutController } from "onearm";
import { Signal } from "typed-signals";

export class TabsBehavior extends LayoutController {
    // Signals for external consumers (scenes, flows)
    onChange = new Signal();

    // State — use _ convention, NOT # private fields
    _activeIndex = 0;

    init() {
        // this.options contains everything from GameConfig except Behavior
        const { nav, content, activeIndex = 0 } = this.options;

        // Find children by name — these names match Figma structure
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

        // Update navigation state
        const navContainer = this.find(this.options.nav);
        if (navContainer) {
            navContainer.children.forEach((item, i) => {
                if (item.setState) item.setState(i === index);
            });
        }

        // Show/hide content pages
        const contentContainer = this.find(this.options.content);
        if (contentContainer) {
            contentContainer.children.forEach((page, i) => {
                page.visible = (i === index);
            });
        }

        this.onChange.emit(index);
    }

    // State sync for ScreenLayout variant switching
    getState() { return { activeIndex: this._activeIndex }; }
    setState({ activeIndex }) {
        if (activeIndex !== undefined) this.setActive(activeIndex);
    }
}
```

**Critical:** `init()` is called from the LayoutController constructor. JS private fields (`#`) are not yet initialized at that point in subclasses. Always use `_` convention for any state in behaviors.

### Step 4: Register in GameConfig

```javascript
import { TabsBehavior } from "./behaviors/TabsBehavior.js";

export const GameConfig = {
    // ...
    behaviors: {
        // Key = component type name from Figma
        SettingsTabs: {
            Behavior: TabsBehavior,   // class reference
            nav: "NavTabs",           // → this.options.nav
            content: "Content",       // → this.options.content
            activeIndex: 0,           // → this.options.activeIndex
        },
    },
};
```

**Key matching:** For regular components, the key matches `config.name`. For instances (`isInstance: true`), it matches `config.type`. This means all instances of the same component type share the same behavior configuration.

### Step 5: Use from Scene or Flow

```javascript
// In Scene.create()
const tabs = this.findBehavior("SettingsTabs");
tabs.onChange.connect(index => {
    console.log("Tab switched to:", index);
});

// In Flow
async function settingsFlow(scope, ctx) {
    const scene = ctx.scenes.get("SettingsScene");
    const tabs = scene.findBehavior("SettingsTabs");
    scope.on(tabs.onChange, index => { /* react to tab change */ });
}
```

## Common Behavior Patterns

### Toggle Group
Children where exactly one is active. Similar to tabs but with visual toggle states.
- Options: `items` (container name), `activeIndex`
- State: `_activeIndex`
- Signal: `onChange`

### Accordion
Expandable sections where 0 or 1 section is open.
- Options: `sections` (container name), `expandedIndex`
- State: `_expandedIndex` (-1 = all collapsed)
- Signal: `onExpand`

### Pagination / Dots
Page indicator with prev/next navigation.
- Options: `dots` (DotsGroup name), `content` (pages container), `prev`/`next` (button names)
- State: `_currentPage`, `_totalPages`
- Signals: `onPageChange`

### Animated Panel
Panel with enter/exit animations triggered by show/hide.
- Options: animation names, durations
- No state sync needed (animations restart on variant switch)
- Methods: `show()`, `hide()`, `toggle()`

## Checklist

- [ ] Figma component has consistent named children across all variants
- [ ] Behavior class extends `LayoutController`
- [ ] Uses `_` convention for state (not `#` private fields)
- [ ] `init()` finds children and sets up signal connections via `connectSignal()`
- [ ] Public signals declared for external consumers
- [ ] `getState()` / `setState()` implemented if component has ScreenLayout variants
- [ ] Registered in `GameConfig.behaviors` with correct component type key
- [ ] `findBehavior(query)` works from scene
- [ ] Tested with `npm run dev -- -game=sandbox`

## Anti-patterns

- **Business logic in behavior** — behaviors manage UI state, not game logic. Game decisions belong in flows.
- **Accessing services from behavior** — behaviors only know about their layout. If you need services, use a scene controller instead.
- **`#` private fields** — will cause runtime errors because `init()` runs before private field initialization.
- **Manual behavior creation** — if you're doing `new MyBehavior(container, opts)` in a scene, it's a regular controller, not a behavior. Behaviors are always auto-attached via `GameConfig.behaviors`.
- **Different child names per variant** — state sync matches by `label`. If portrait has `NavBar` but landscape has `Navigation`, sync breaks silently.
