# Component Pipeline: Figma to Engine

## Overview

```
Figma (design) --> npm run export --> components.config.json --> LayoutBuilder --> Display Object
```

Three layers of customization:
1. **componentRegistry** (Figma export) — how to extract data from Figma
2. **ObjectFactory** (engine) — how to create the display object
3. **LayoutBuilder** (engine) — how to assemble the component from config

## Key Files

### Figma Export Side
- `tools/figma/src/core/componentRegistry.ts` — register component types for special export handling
- `tools/figma/src/handlers/special/specialProcessors.ts` — custom processor functions
- `tools/figma/src/core/NodeProcessor.ts` — dispatches nodes to processors
- `tools/figma/src/extractors/` — property extraction (fill, stroke, text, layout, etc.)

### Engine Side
- `modules/engine/common/displayObjects/addObjects.js` — ObjectFactory + LayoutBuilder registrations
- `modules/engine/common/core/ObjectFactory.js` — factory registry
- `modules/engine/services/LayoutBuilder.js` — builds display trees from config
- `modules/engine/common/core/BaseContainer.js` — base class for components
- `modules/engine/common/unified/` — unified components (Button, Slider)

### Config
- `games/<game>/assets/components.config.json` — exported layout configs

## Component Registry API

```typescript
// tools/figma/src/core/componentRegistry.ts
registerComponentType({
  match: 'MyWidget',        // String to match against component name
  matchMode: 'suffix',      // 'suffix' (default) or 'exact'
  type: 'MyWidget',         // Output type in JSON
  process: processFn,       // Processor for COMPONENT nodes
  processSet: processSetFn, // Processor for COMPONENT_SET (variants)
  handleInstance: false,     // Whether to route instances through process()
});
```

### Matching Rules
- **suffix** (default): component name ends with `match` string. E.g. `PlayButton` matches `Button`
- **exact**: component name equals `match` exactly. E.g. only `DotsGroup` matches `DotsGroup`
- Order matters: more specific matches first in registry
- `_ph` suffix on names = placeholder (handled separately)

### Registered Types (current)

| match | matchMode | type | Has process | Has processSet |
|-------|-----------|------|-------------|----------------|
| ProgressBar | suffix | ProgressBar | yes | yes |
| DotsGroup | exact | DotsGroup | yes | no |
| RadioGroup | exact | RadioGroup | yes (handleInstance) | no |
| ReelsLayout | exact | ReelsLayout | yes | no |
| ValueSlider | suffix | ValueSlider | yes (handleInstance) | yes |
| ScrollBox | suffix | ScrollBox | yes | no |
| Toggle | suffix | CheckBoxComponent | no | yes |
| Button | suffix | Button | no | no |

## Custom Processor API

```typescript
// tools/figma/src/handlers/special/specialProcessors.ts
export function processMyWidget(node: AbstractNode, context: ProcessingContext) {
  const { processNode } = context;
  const children = node.children || [];

  // Find specific children by name
  const bg = children.find(c => c.name === 'bg');
  const fill = children.find(c => c.name === 'fill');

  return {
    name: node.name,
    type: 'MyWidget',
    width: node.width,
    height: node.height,
    // Custom properties extracted from children
    bg: bg ? processNode(bg, context) : null,
    fill: fill ? processNode(fill, context) : null,
  };
}
```

## ObjectFactory API

```javascript
// modules/engine/common/displayObjects/addObjects.js

// Simple constructor (params passed as-is):
ObjectFactory.registerObjectConstructor("MyWidget", MyWidgetClass);

// Factory function (with access to factory and services):
ObjectFactory.registerObjectFactory("MyWidget", (params, factory, services) => {
  return new MyWidgetClass({ ...params, audio: services.get("audio") });
});
```

## LayoutBuilder API

```javascript
// modules/engine/common/displayObjects/addObjects.js

LayoutBuilder.registerLayoutBuilder("MyWidget", function(config) {
  const { name, children, ...rest } = config;
  const displayObject = new MyWidgetClass();
  displayObject.label = name;

  if (children?.length) {
    displayObject.addChild(...this.buildLayoutChildren(children));
  }

  displayObject.init(rest); // post-children initialization
  return displayObject;
});
```

### Generic Builder Behavior
Types without a registered LayoutBuilder are handled generically:
- **Button**: if has children, first child becomes `image` view for FancyButton
- **CheckBoxComponent**: backward compat wrapper
- **Other types**: children built recursively, properties that look like component configs are auto-built

## components.config.json Structure

```json
{
  "components": [
    {
      "name": "MyWidget",
      "type": "MyWidget",
      "variants": {
        "default": {
          "x": 100, "y": 200,
          "width": 300, "height": 150,
          "children": [
            { "name": "bg", "type": "Rectangle", "width": 300, "height": 150, "style": { "fill": "#333" } },
            { "name": "label", "type": "Text", "text": "Hello", "style": { "fontSize": 24 } }
          ]
        },
        "portrait": { /* alternate layout */ },
        "landscape": { /* alternate layout */ }
      }
    }
  ]
}
```

Key fields:
- `name` — unique identifier
- `type` — maps to ObjectFactory/LayoutBuilder
- `variants` — responsive layouts (default/portrait/landscape)
- `children` — nested component tree
- `isInstance: true` — reference to another component definition
- `componentProperties` — variant properties from Figma

## Engine Component Class Pattern

```javascript
import { BaseContainer } from "../core/BaseContainer.js";

export class MyWidget extends BaseContainer {
  constructor(params) {
    super(params);
    // Initialize from params
  }

  // Called after children are added (if using custom LayoutBuilder)
  init(options) {
    const bg = this.find("bg");
    const label = this.find("label");
    // Setup logic
  }
}
```

BaseContainer provides:
- `find(name)` / `get(name)` — find child by name (dot-notation for nesting)
- `findAll(pattern)` — find all matching children
- `forAll(pattern, fn)` — apply function to all matching
- `createObject(type, params)` — create via ObjectFactory
- `displayConfig` — zone-based positioning
