# Scene Config v2 (Draft)

Status: Draft 0.5

This document defines a new scene layout configuration format intended to replace the current Figma-exported `components.config.json` shape.

Goals:
- Be easy to read and edit by hand
- Be simple to export from Figma
- Be simple to consume from runtime code
- Be portable across Pixi.js-based engines
- Separate layout structure from runtime behaviors and business logic
- Treat visual variants as regular named prefab definitions, not as a special schema feature
- Keep scene modes simple by storing full trees per mode instead of patch/remove/add operations
- Reduce unnecessary nesting in the document shape
- Keep the base node model minimal and move size/layout specifics into type-specific fields

Non-goals:
- Encode engine-specific classes
- Encode runtime services, behaviors, or flow logic
- Encode all possible widget semantics in the base schema
- Mirror the current Onearm config format exactly
- Define runtime state synchronization rules (that belongs to runtime/builder design)

---

## 1. Core model

The schema is based on four concepts:

1. **Scenes** — top-level screens
2. **Scene modes** — full layout trees for each mode (`portrait`, `landscape`, `default`, etc.)
3. **Prefabs** — reusable named definitions instantiated inside scenes
4. **Nodes** — generic tree elements used by both scenes and prefabs

Important rules:

> A visual "variant" is not a special schema entity. It is just another named prefab definition.

> Node `id` is the primary technical identity key in the schema. If the same logical scene object exists across multiple modes, it must keep the same `id`.

> Node `label` is the optional semantic name used by scene logic and query APIs. Labels may repeat in different branches of the tree.

> A prefab definition is a root node tree.

> A scene mode definition is also a root node tree.

Examples of prefab names:
- `Dog.default`
- `Dog.small`
- `Dog.card`
- `Dog.portrait`
- `Dog.landscape`
- `Slider.portrait`
- `Slider.landscape`

This means a scene mode can choose a different concrete `type` for the same logical node without needing patch/remove/add syntax.

---

## 2. Design principles

1. The format is tree-based, not index-based.
2. Every scene mode stores a full tree.
3. Every prefab definition stores a full tree.
4. There is no patch language in v1 (`nodes`, `remove`, `add`, `move`, `replace` are intentionally omitted).
5. Node `type` values are generic and runtime-agnostic.
6. Runtime-specific data must live in `meta`, `extras`, or future `extensions`.
7. Structural differences between visual configurations should be modeled as different prefab definitions.
8. Complex widgets should be modeled as reusable prefabs or runtime-registered engine types, not as hardcoded schema-specific composite node types.
9. Root wrappers should be avoided when they do not add real value.
10. The base node model should describe identity, transform, visibility, and hierarchy only; size-related fields belong to specific node types.
11. Type-specific intrinsic fields live at top level for intrinsic types; runtime-registered types use `props`.

Rationale:
- Full trees are easier to read and export from Figma.
- Full trees avoid ambiguity when an object changes parent between modes.
- Stable `id` across mode trees gives runtime enough information to recognize the same logical object.
- Removing `root` wrappers reduces document noise and nesting depth.

---

## 3. Top-level document shape

```json
{
  "format": "pixi-scene",
  "version": 1,
  "extensionsUsed": [],
  "extensionsRequired": [],
  "prefabs": {},
  "scenes": {}
}
```

### Top-level fields

| Field | Type | Required | Description |
|---|---|---:|---|
| `format` | string | yes | Must be `pixi-scene` |
| `version` | number | yes | Schema version |
| `extensionsUsed` | string[] | no | Optional list of extension identifiers |
| `extensionsRequired` | string[] | no | Optional list of required extension identifiers |
| `prefabs` | object | yes | Reusable prefab definitions keyed by name |
| `scenes` | object | yes | Scene definitions keyed by name |

Notes:
- `prefabs[name]` is directly a root node tree.
- `scenes[name].modes[mode]` is directly a root node tree.
- The distinction is semantic: scenes are entry points, prefabs are reusable definitions.

---

## 4. Scene definition

A scene is a set of full trees keyed by mode name.

```json
{
  "modes": {
    "portrait": {
      "id": "root",
      "type": "container",
      "children": []
    },
    "landscape": {
      "id": "root",
      "type": "container",
      "children": []
    }
  },
  "meta": {},
  "extras": {}
}
```

### Scene fields

| Field | Type | Required | Description |
|---|---|---:|---|
| `modes` | object | yes | Full trees keyed by mode name |
| `meta` | object | no | Human-readable semantic metadata for the scene |
| `extras` | object | no | Arbitrary machine-readable payload for the scene |

### Mode definition shape

A mode definition is directly a root node tree.

```json
{
  "id": "root",
  "type": "container",
  "children": []
}
```

Rules:
1. Each mode is a complete tree.
2. Different modes may use different parents, child order, and concrete node types for the same logical object.
3. If the same logical scene object exists across modes, it should keep the same `id`.
4. A scene must contain at least one mode.

Recommended mode names:
- `default`
- `portrait`
- `landscape`
- `desktop`

---

## 5. Prefab definition

A prefab is a single reusable named definition represented directly as a root node tree.

```json
{
  "id": "root",
  "type": "container",
  "children": [],
  "meta": {},
  "extras": {}
}
```

### Prefab definition shape

A prefab definition has no extra wrapper object. It is simply a root node tree.

Rules:
1. A prefab definition is one full tree.
2. Different visual configurations should usually be represented as different named prefab definitions.
3. Prefabs do not have a built-in `variants` field in v1.
4. Prefabs do not have mode-specific trees in v1; mode-specific behavior should be expressed by choosing a different concrete `type` from the scene.
5. Definition-level metadata may be stored in the root node's `meta` / `extras`.

---

## 6. Identity rules

Identity is split into two concepts:
- `id` — technical identity for exporter, builder, internal links, and structural runtime operations
- `label` — semantic name for scene logic and query APIs

### `id` rules

1. Every node must have an `id`.
2. `id` must be unique within a single tree.
3. If the same logical object exists across multiple scene modes, it must keep the same `id`.
4. The same logical object may use a different concrete `type`, a different parent, a different position, and a different subtree between modes.
5. Internal node ids inside different prefab definitions do not need to match each other.
6. A runtime may use stable scene-level `id` to map data, behavior bindings, mask links, or state continuity across modes.
7. `id` is a technical key and does not need to be human-readable.

### `label` rules

1. `label` is optional.
2. `label` is intended for game logic, queries, and semantic access patterns.
3. `label` does not need to be globally unique.
4. Repeated labels in different branches are valid.
5. Query systems may use label paths such as `Bet.value` and `Volume.value`.
6. If duplicate labels exist among siblings, a query API may require more specific matching or expose a `findAll`-style behavior.

### Example: same logical object, different mode trees

```json
{
  "modes": {
    "portrait": {
      "id": "root",
      "type": "container",
      "children": [
        {
          "id": "volumeSlider",
          "type": "Slider.portrait",
          "x": 80,
          "y": 900
        }
      ]
    },
    "landscape": {
      "id": "root",
      "type": "container",
      "children": [
        {
          "id": "rightPanel",
          "type": "container",
          "children": [
            {
              "id": "volumeSlider",
              "type": "Slider.landscape",
              "x": 900,
              "y": 100
            }
          ]
        }
      ]
    }
  }
}
```

In this example, `volumeSlider` is one logical scene object. It has the same `id` across both modes, even though its parent and concrete `type` differ.

---

## 7. Node model

Every tree is built from nodes.

### Base node shape

```json
{
  "id": "n_0012",
  "label": "title",
  "type": "text",
  "x": 0,
  "y": 0,
  "scaleX": 1,
  "scaleY": 1,
  "rotation": 0,
  "alpha": 1,
  "visible": true,
  "anchorX": 0,
  "anchorY": 0,
  "pivotX": 0,
  "pivotY": 0,
  "zIndex": 0,
  "mask": "n_0042",
  "children": [],
  "meta": {},
  "extras": {},
  "props": {}
}
```

### Base node fields

| Field | Type | Required | Description |
|---|---|---:|---|
| `id` | string | yes | Technical unique node identity inside the tree |
| `label` | string | no | Optional semantic name for logic/query APIs |
| `type` | string | yes | Concrete node type |
| `x` | number | no | Local x position |
| `y` | number | no | Local y position |
| `scaleX` | number | no | Local X scale |
| `scaleY` | number | no | Local Y scale |
| `rotation` | number | no | Local rotation |
| `alpha` | number | no | Opacity |
| `visible` | boolean | no | Visibility |
| `anchorX` | number | no | Optional anchor X for supported node types |
| `anchorY` | number | no | Optional anchor Y for supported node types |
| `pivotX` | number | no | Optional pivot X for supported runtimes/types |
| `pivotY` | number | no | Optional pivot Y for supported runtimes/types |
| `zIndex` | number | no | Optional display order hint |
| `mask` | string | no | Optional mask source node `id` from the same tree |
| `children` | node[] | no | Child nodes |
| `meta` | object | no | Semantic metadata |
| `extras` | object | no | Arbitrary payload |
| `props` | object | no | Runtime-facing props for non-intrinsic types |

Rules:
- `id` must be unique within one tree.
- `label` may repeat in different branches.
- Nodes that do not support a field may ignore it at runtime.
- Only composable node types should contain `children`.
- `width` and `height` are not base node fields in v1; they are type-specific fields.
- If `mask` is used, it must reference a node `id` from the same tree.
- Root-node metadata for prefab definitions may also live in `meta` / `extras`.

---

## 8. Core node types

The initial schema intentionally defines a small set of generic intrinsic node types.

In addition to these intrinsic types, a node `type` may also refer to:
- a reusable document-defined prefab from `prefabs`
- a runtime-registered engine type such as `Button`

Resolution order is runtime-defined, but names must not conflict between intrinsic types, document-defined prefab names, and runtime-registered types.

### 8.1 `container`

```json
{
  "id": "root",
  "type": "container",
  "children": []
}
```

A generic grouping node.

### 8.2 `sprite`

There is no separate `image` intrinsic type in v1. Raster images are represented by `sprite`.

```json
{
  "id": "logo",
  "type": "sprite",
  "texture": "logo",
  "width": 200,
  "height": 80,
  "anchorX": 0.5,
  "anchorY": 0.5
}
```

Type-specific fields:

| Field | Type | Required | Description |
|---|---|---:|---|
| `texture` | string | yes | Texture identifier |
| `frame` | string | no | Optional frame identifier |
| `tint` | string/number | no | Optional tint |
| `width` | number | no | Optional explicit display width |
| `height` | number | no | Optional explicit display height |

### 8.3 `text`

```json
{
  "id": "title",
  "type": "text",
  "text": "Gates of Olympus",
  "style": "title",
  "maxWidth": 320
}
```

Type-specific fields:

| Field | Type | Required | Description |
|---|---|---:|---|
| `text` | string | yes | Text content |
| `style` | object | no | Full text style object |
| `maxWidth` | number | no | Optional width-related constraint |
| `fit` | string | no | Optional fit policy, e.g. `shrink` |

### 8.4 `graphics`

`graphics` is the intrinsic geometry/shape node type. It may also be used as a mask source.

```json
{
  "id": "panelBg",
  "type": "graphics",
  "shape": "rect",
  "width": 400,
  "height": 120,
  "fill": "#1f1f1f",
  "radius": 16
}
```

Type-specific fields:

| Field | Type | Required | Description |
|---|---|---:|---|
| `shape` | string | yes | `rect`, `roundRect`, `circle`, `ellipse`, `polygon` |
| `width` | number | no | Shape width when applicable |
| `height` | number | no | Shape height when applicable |
| `fill` | string/object | no | Fill definition |
| `stroke` | string/object | no | Stroke definition |
| `strokeWidth` | number | no | Stroke width |
| `radius` | number | no | Corner radius for rect-like shapes |
| `points` | number[] | no | Polygon points |

### 8.5 `spine`

```json
{
  "id": "zeus",
  "type": "spine",
  "skeleton": "zeus",
  "skin": "default",
  "animation": "idle"
}
```

Additional fields:

| Field | Type | Required | Description |
|---|---|---:|---|
| `skeleton` | string | yes | Spine skeleton identifier |
| `skin` | string | no | Skin name |
| `animation` | string | no | Default animation |

### 8.6 Document-defined and runtime-registered types

A node may use a concrete `type` that is not one of the intrinsic types above.

For intrinsic types, schema-defined type-specific fields should be placed at top level.
For runtime-registered types, type-specific data should generally be placed inside `props`.

Example: document-defined prefab type

```json
{
  "id": "dog1",
  "type": "Dog.small",
  "props": {
    "mood": "happy"
  }
}
```

Example: runtime-registered engine type

```json
{
  "id": "spinButton",
  "type": "Button",
  "props": {
    "label": "SPIN"
  }
}
```

Rules:
- If `type` matches a name in `prefabs`, it instantiates that prefab definition.
- If `type` matches a runtime-registered engine type, runtime builds that object directly.
- Different visual configurations should usually be modeled as different concrete type names.
- A scene may use different concrete types for the same node `id` in different modes.
- Runtime query systems are expected to use `label`, not `id`, for semantic lookup.

### 8.7 `slot`

```json
{
  "id": "boardSlot",
  "type": "slot",
  "slot": "Board",
  "width": 1000,
  "height": 600
}
```

Type-specific fields:

| Field | Type | Required | Description |
|---|---|---:|---|
| `slot` | string | yes | Semantic mount point name |
| `width` | number | no | Slot area width |
| `height` | number | no | Slot area height |

Rules:
- `slot` replaces naming conventions like `_ph`.
- A runtime may mount a child scene, widget, or container into a slot.

---

## 9. Prefabs with multiple configurations

The schema does not define `variants` as a first-class concept. Instead, each configuration is represented as its own named prefab definition.

Example:

```json
{
  "prefabs": {
    "Dog.default": {
      "id": "root",
      "type": "container",
      "children": [],
      "meta": { "family": "Dog" }
    },
    "Dog.small": {
      "id": "root",
      "type": "container",
      "children": [],
      "meta": { "family": "Dog" }
    },
    "Dog.card": {
      "id": "root",
      "type": "container",
      "children": [],
      "meta": { "family": "Dog" }
    }
  }
}
```

Recommended convention:
- use names like `Family.config`
- store grouping hints in `meta.family`

Examples:
- `Button.primary`
- `Button.secondary`
- `Dog.default`
- `Dog.portrait`
- `Dog.landscape`
- `Slider.portrait`
- `Slider.landscape`

---

## 10. Full example document

```json
{
  "format": "pixi-scene",
  "version": 1,
  "prefabs": {
    "Slider.portrait": {
      "id": "root",
      "type": "container",
      "children": [
        { "id": "track", "type": "sprite", "texture": "slider_track_vertical" },
        { "id": "thumb", "type": "sprite", "texture": "slider_thumb" }
      ],
      "meta": { "family": "Slider" }
    },
    "Slider.landscape": {
      "id": "root",
      "type": "container",
      "children": [
        { "id": "track", "type": "sprite", "texture": "slider_track_horizontal" },
        { "id": "thumb", "type": "sprite", "texture": "slider_thumb" }
      ],
      "meta": { "family": "Slider" }
    }
  },
  "scenes": {
    "SettingsScene": {
      "modes": {
        "portrait": {
          "id": "root",
          "type": "container",
          "children": [
            {
              "id": "header",
              "type": "text",
              "text": "Settings",
              "style": "title",
              "x": 360,
              "y": 60
            },
            {
              "id": "volumeSlider",
              "type": "Slider.portrait",
              "x": 80,
              "y": 900
            }
          ]
        },
        "landscape": {
          "id": "root",
          "type": "container",
          "children": [
            {
              "id": "rightPanel",
              "type": "container",
              "children": [
                {
                  "id": "header",
                  "type": "text",
                  "text": "Settings",
                  "style": "title",
                  "x": 300,
                  "y": 60
                },
                {
                  "id": "volumeSlider",
                  "type": "Slider.landscape",
                  "x": 900,
                  "y": 100
                },
                {
                  "id": "spinButton",
                  "type": "Button",
                  "props": {
                    "label": "SPIN"
                  }
                }
              ]
            }
          ]
        }
      }
    }
  }
}
```

---

## 11. Runtime expectations

A Pixi-based runtime consuming this format should:

1. Parse the document root.
2. Resolve scene and prefab definitions by name.
3. Pick one active scene mode.
4. Build the full tree for that mode.
5. Resolve node `type` into either an intrinsic type, a document-defined prefab, or a runtime-registered engine type.
6. Preserve scene-level identity based on stable node `id` when switching modes.
7. Expose semantic lookup by `label` for scene logic if the runtime supports query APIs.
8. Interpret only the node types it supports.
9. Ignore unknown `meta` and `extras` fields unless explicitly integrated.

The runtime should not require engine-specific class names in the document.

---

## 12. Masking

Masking is supported in v1 through an explicit `mask` field on the target node. There is no dedicated `mask` intrinsic type.

Example:

```json
{
  "id": "panel",
  "type": "container",
  "mask": "panelMask",
  "children": [
    {
      "id": "panelMask",
      "type": "graphics",
      "shape": "rect",
      "width": 300,
      "height": 120,
      "fill": "#ffffff"
    },
    {
      "id": "bg",
      "type": "sprite",
      "texture": "panel_bg"
    }
  ]
}
```

Rules:
- A mask is represented by a regular node, typically `sprite` or `graphics`.
- The schema does not introduce a separate `image` type for masks or non-mask images; both use `sprite`.
- `mask` contains the technical `id` of the mask source node.
- The mask source node must exist in the same tree as the target node.
- In v1, a mask source is treated as mask-only content. If the same shape should also be visible as regular content, it should be duplicated explicitly.
- A target node may have at most one mask in v1.
- Shared one-mask-to-many-targets behavior is out of scope for v1.
- Figma export should preserve mask source objects as normal nodes and emit explicit `mask` bindings.

This keeps the core schema simple while still allowing mask-capable runtimes to interpret mask objects deterministically.

---

## 13. Figma exporter expectations

The Figma exporter targeting this format should:

1. Export generic node types only.
2. Export each scene mode as a full tree.
3. Export each meaningful Figma variant/configuration as a separate named prefab definition.
4. Export explicit `slot` nodes instead of suffix-based conventions like `_ph`.
5. Preserve stable node ids across different scene modes for the same logical object.
6. Put grouping information like prefab family / Figma variant properties into `meta` if needed.
7. Avoid encoding runtime behaviors, services, or engine-specific widget classes.
8. Export prefab definitions directly as root node trees without an extra `root` wrapper.

The exporter should not:
- emit patch/remove/add operations
- flatten runtime widgets into engine-specific structures
- invent Onearm-only node types unless wrapped in future extensions
- inject hidden behavior wiring into the layout document
- rely on `variants` as a runtime schema concept

---

## 14. Explicit exclusions from v1

The following are intentionally out of scope for v1:
- behaviors and controller wiring
- service configuration
- state machine and flow configuration
- button/check box/radio group/scroll bar/value slider as core schema node types
- implicit placeholder naming conventions
- auto-generated runtime masks as hidden schema behavior
- a built-in `variants` mechanism for prefabs
- patch/remove/add/move/replace operations for mode diffs
- complex layout engines beyond explicit node trees and transforms

These may be layered on top later through:
- reusable prefabs
- runtime widget factories
- semantic `meta`
- optional extensions

---

## 15. Open questions

These points still need a final decision before implementation:

1. Should `rotation` be stored in radians or degrees?
2. Do we want both `default` and explicit `portrait`/`landscape`, or should one be mandatory?
3. Should scene-level `meta` / `extras` remain the only non-node scene fields in v1?
4. Do we want a formal naming convention for exported prefab names from Figma component sets?
5. Should `zIndex` remain only an optional hint, or should future versions formalize sorting behavior?
6. Should future versions formalize `pivot` behavior more strictly across intrinsic types?

---

## 16. Proposed implementation order

1. Finalize this spec.
2. Implement a minimal runtime reader/builder for:
   - `container`
   - `sprite`
   - `text`
   - `graphics`
   - `spine`
   - document-defined reusable types
   - runtime-registered types
   - `slot`
3. Implement scene mode selection using full per-mode trees.
4. Use stable node `id` as logical identity across modes.
5. Build a converter from current exported config to this draft format.
6. Update the Figma exporter to emit this format directly.
