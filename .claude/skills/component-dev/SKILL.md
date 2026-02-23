---
name: component-dev
description: |
  Skill for creating new UI components for the onearm engine with full Figma-to-engine pipeline.
  Use this skill whenever the user wants to: create a new component type, add a custom component,
  register a component in ObjectFactory, add a Figma export processor, connect a Figma component
  to the engine, build a new UI widget, or understand how the component pipeline works.
  Trigger on any mention of: new component, create component, add component type, register component,
  ObjectFactory, componentRegistry, component processor, specialProcessors, addObjects,
  Figma component, component pipeline, custom widget, UI component, LayoutBuilder register,
  registerComponentType, registerObjectFactory, registerObjectConstructor, registerLayoutBuilder.
---

# Component Development on onearm Engine

You are creating new UI components for the onearm engine. Components flow through a pipeline:
**Figma design -> export -> components.config.json -> LayoutBuilder -> Display Object**.

For detailed API reference and file locations, read `references/component-pipeline.md`.

## Decision: What Level of Customization?

Before creating a component, determine which layers need customization:

### Level 1: Simple Component (generic export + ObjectFactory only)
**When:** The component is a container with standard children (rectangles, text, sprites).
Figma export handles it generically — no special extraction needed.

**Steps:**
1. Create class extending `BaseContainer` in `modules/engine/common/unified/`
2. Register in `modules/engine/common/displayObjects/addObjects.js` via ObjectFactory
3. Design in Figma with correct naming (name must end with registered type or match exactly)
4. `npm run export` — config generated automatically

### Level 2: Custom Export (+ componentRegistry)
**When:** Figma structure needs non-standard extraction (specific children by name, computed properties, variant processing).

**Additional steps:**
1. Add `registerComponentType()` in `tools/figma/src/core/componentRegistry.ts`
2. Write processor function in `tools/figma/src/handlers/special/specialProcessors.ts`
3. Import and wire up the processor in componentRegistry

### Level 3: Custom Build (+ LayoutBuilder)
**When:** Component needs post-children initialization, or assembly logic differs from the generic builder (e.g. find children by name after adding them, call `init()`).

**Additional step:**
1. Add `LayoutBuilder.registerLayoutBuilder()` in `addObjects.js`

## Implementation Workflow

### Step 1: Design the Component

Decide on:
- Component name and type string
- Constructor parameters
- Children structure (if any)
- Whether it needs variants (portrait/landscape)
- Whether Figma export needs custom handling

### Step 2: Create the Engine Class

```javascript
// modules/engine/common/unified/MyWidget.js
import { BaseContainer } from "../core/BaseContainer.js";

export class MyWidget extends BaseContainer {
  constructor({ customProp, ...rest }) {
    super(rest);
    this.#customProp = customProp;
  }

  // If using custom LayoutBuilder with post-children init:
  init(options = {}) {
    const bg = this.find("bg");
    const content = this.find("content");
    // setup...
  }
}
```

### Step 3: Register in ObjectFactory

File: `modules/engine/common/displayObjects/addObjects.js`

```javascript
import { MyWidget } from "../unified/MyWidget.js";

// Simple:
ObjectFactory.registerObjectConstructor("MyWidget", MyWidget);

// Or with services:
ObjectFactory.registerObjectFactory("MyWidget", (params, factory, services) => {
  return new MyWidget({ ...params, audio: services.get("audio") });
});
```

### Step 4: (If Level 2) Register in componentRegistry

File: `tools/figma/src/core/componentRegistry.ts`

```typescript
import { processMyWidget } from '../handlers/special/specialProcessors';

registerComponentType({
  match: 'MyWidget',
  type: 'MyWidget',
  process: processMyWidget,
});
```

File: `tools/figma/src/handlers/special/specialProcessors.ts`

```typescript
export function processMyWidget(node: AbstractNode, context: ProcessingContext) {
  const children = node.children || [];
  const bg = children.find(c => c.name === 'bg');

  return {
    name: node.name,
    type: 'MyWidget',
    width: node.width,
    height: node.height,
    bg: bg ? context.processNode(bg, context) : null,
  };
}
```

### Step 5: (If Level 3) Register LayoutBuilder

File: `modules/engine/common/displayObjects/addObjects.js`

```javascript
LayoutBuilder.registerLayoutBuilder("MyWidget", function(config) {
  const { name, children, ...rest } = config;
  const widget = new MyWidget(rest);
  widget.label = name;

  if (children?.length) {
    widget.addChild(...this.buildLayoutChildren(children));
  }

  widget.init();
  return widget;
});
```

### Step 6: Export from Engine Module

Add export to `modules/engine/index.js` if the component should be part of the public API:

```javascript
export { MyWidget } from "./common/unified/MyWidget.js";
```

### Step 7: Design in Figma and Export

1. Create component in Figma with correct naming
2. Run `npm run export`
3. Verify `components.config.json` has correct structure
4. Test: `npm run dev -- -game=sandbox`

## Naming Conventions

| Aspect | Convention | Example |
|--------|-----------|---------|
| Engine class | PascalCase | `MyWidget` |
| File name | PascalCase.js | `MyWidget.js` |
| Type string | PascalCase (matches class) | `"MyWidget"` |
| Figma component | Name ends with type | `PlayMyWidget`, `MainMyWidget` |
| Config name | Instance name from Figma | `"PlayMyWidget"` |

## Existing Component Examples

Study these for patterns:

| Component | ObjectFactory | Registry | LayoutBuilder | File |
|-----------|--------------|----------|---------------|------|
| Button | factory | suffix match (no processor) | generic builder | unified/Button.js |
| Slider | factory | suffix `ValueSlider` + processor | custom builder | unified/Slider.js |
| ProgressBar | constructor | suffix + processor | generic builder | @pixi/ui |
| DotsGroup | constructor | exact + processor | custom builder | UI/DotsGroup.js |
| CheckBoxComponent | factory | suffix `Toggle` + processSet | generic builder | UI/CheckBoxComponent.js |
| ScrollBoxComponent | constructor | suffix `ScrollBox` + processor | custom builder | UI/ScrollBoxComponent.js |

## Checklist

- [ ] Engine class created (extends BaseContainer or appropriate base)
- [ ] Registered in ObjectFactory (`addObjects.js`)
- [ ] (If custom export) Registered in componentRegistry
- [ ] (If custom export) Processor function written in specialProcessors.ts
- [ ] (If custom build) LayoutBuilder registered
- [ ] Exported from `modules/engine/index.js` (if public API)
- [ ] Figma component designed with correct naming
- [ ] `npm run export` produces correct config
- [ ] `npm run build` succeeds
- [ ] Tested in sandbox or game
