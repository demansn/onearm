# Figma Mapping v2 (Draft)

Status: Draft 0.2

This document describes how the Figma export pipeline should map Figma nodes and component structures into the Scene Config v2 format defined in `docs/scene-config-v2.md`.

See also:
- `docs/scene-config-v2.md` — core schema

Goals:
- Define a deterministic mapping from Figma structures to Scene Config v2
- Keep export rules separate from the core scene schema
- Preserve stable technical ids across scene modes
- Export semantic labels for scene logic
- Expand Figma component variants into named prefab definitions
- Export only generic schema node types plus runtime/custom concrete types when explicitly intended

Non-goals:
- Define runtime LayoutBuilder behavior
- Define state synchronization rules
- Preserve backwards compatibility with the current `components.config.json` format

---

## 1. Current exporter observations

The current `tools/figma/` implementation mixes several layers:

1. **Raw extraction**
   - geometry
   - text styles
   - fills/strokes
   - node hierarchy

2. **Schema shaping**
   - scenes vs components
   - modes vs variants
   - instance expansion

3. **Onearm-specific runtime decisions**
   - `SuperContainer`
   - `AutoLayout`
   - `CheckBoxComponent`
   - `ValueSlider`
   - `ScrollBox`
   - `Reels`
   - placeholder `_ph`
   - synthetic masks

For v2, these layers should be separated more clearly.

### Desired split for v2

- **Figma mapping layer** should output Scene Config v2
- **Runtime layer** should decide how concrete `type` values are built in LayoutBuilder v2
- **Engine-specific widget mapping** should be minimized or moved into explicit runtime/custom type handling

---

## 2. Guiding rules for Figma → Scene Config v2

1. Export full trees, not patches.
2. Preserve stable technical ids across scene modes.
3. Expand reusable Figma variants into named prefab definitions.
4. Prefer generic intrinsic types where possible.
5. Do not export legacy Onearm runtime class names unless explicitly intended as runtime concrete types.
6. Do not synthesize hidden structures that do not exist in the schema contract.
7. Keep Figma-specific heuristics documented here, not hidden in ad hoc processors.

---

## 3. Top-level mapping

### 3.1 Figma page → export source

Initial assumption for v2:
- export reads a dedicated Figma page named `layouts`

This matches the current exporter behavior in `ExportPipeline.run('layouts')`.

### 3.2 Top-level nodes on `layouts` page

Top-level nodes should map to one of:
- scene definitions
- prefab definitions
- ignored/support nodes

The exporter must classify them explicitly.

---

## 4. Scene detection

### Initial rule

A top-level Figma node is treated as a **scene** if its cleaned name ends with `Scene`.

Examples:
- `HUDScene`
- `PreloaderScene`
- `SettingsScene`

This matches the current registry idea and is simple enough for v2.

### Export shape

A scene exports to:

```json
{
  "scenes": {
    "HUDScene": {
      "modes": {
        "portrait": { "id": "root", "type": "container", "children": [] },
        "landscape": { "id": "root", "type": "container", "children": [] }
      }
    }
  }
}
```

### Current exporter mismatch

The current exporter treats scenes specially through `isScene` and emits `modes` in the old format. That part can conceptually remain, but the output shape must change to full trees per mode in Scene Config v2.

---

## 5. Mode detection

### Initial rule

Scene modes are derived from top-level Scene variants or child mode wrappers using canonical mode names:
- `default`
- `portrait`
- `landscape`
- `desktop`

The exact Figma structure still needs finalization, but the exported schema should only contain these normalized mode keys.

### Requirements

- mode names must be normalized during export
- each mode must export a full tree
- if the same logical object exists in multiple modes, it should keep the same exported technical `id`

### Open point

We still need to finalize which Figma source structure is preferred for modes:
- Component Set variants for scenes
- named child frames inside a scene container
- some hybrid approach

This should be decided before implementing LayoutBuilder v2.

---

## 6. Prefab detection

### Initial rule

Any top-level exportable node on the `layouts` page that is **not** classified as a scene is treated as a **prefab**.

Examples:
- `Slider.portrait`
- `Slider.landscape`
- `Dog.card`
- `WinPanel`

### Export shape

```json
{
  "prefabs": {
    "Slider.portrait": {
      "id": "root",
      "type": "container",
      "children": []
    }
  }
}
```

### Naming policy

For now, prefab names should be stable, explicit, and human-readable.

Recommended convention:
- `Family.config`
- examples: `Slider.portrait`, `Dog.small`, `Button.primary`

A stricter naming strategy for Figma Component Sets will be documented later.

---

## 7. Technical ids and semantic labels

Scene Config v2 separates two concepts:

- `id` — technical unique identity for exporter, builder, mask links, and structural runtime logic
- `label` — semantic name for scene logic and query APIs

### 7.1 Semantic `label`

Rule:
- exported `label` should come from the Figma node name after minimal cleaning/removing export-only suffixes

Requirements:
- `label` is used for scene logic and query paths
- `label` does not need to be globally unique
- repeated labels in different branches are valid

Example:
- `Bet.value`
- `Volume.value`

This means Figma naming should primarily serve semantic labels.

### 7.2 Technical `id`

Rule:
- if the same logical object appears in multiple scene modes, it must export with the same technical `id`

Requirements:
- `id` must be unique within one exported tree
- `id` does not need to be human-readable
- `id` should be generated automatically by the exporter
- `id` should not be derived solely from visible names

### 7.3 Automatic semantic matching

The preferred v2 strategy is automatic semantic matching, not mandatory manual keys in Figma names.

Exporter should derive a **semantic signature** for each node and use it to match logical objects across scene modes.

Recommended signature inputs:
1. scope (scene/prefab)
2. semantic owner path (path through labeled ancestors only)
3. node label
4. match type / family
5. occurrence index when required to disambiguate duplicates

Technical id is then generated from that semantic signature, for example:
- `id = shortHash(signature)`
- exported as opaque value such as `n_a81f2c`

### 7.4 Match type / family

To match logically equivalent objects across modes, exporter should not always use the full concrete type name.

Examples:
- `Slider.portrait` and `Slider.landscape` should usually match as family `Slider`
- `Dog.small` and `Dog.card` should usually match as family `Dog`
- intrinsic types like `text` or `sprite` may use the intrinsic type directly

Initial recommendation:
- for prefab names, derive family from the part before the first dot
- `Slider.portrait` → `Slider`
- `Dog.small` → `Dog`

This allows the same logical object to switch visual prefab definitions between modes while keeping one technical `id`.

### 7.5 Ambiguity handling

Automatic matching will not always be sufficient.

Exporter should handle ambiguity like this:
1. try semantic matching
2. if multiple candidates remain, disambiguate by occurrence index in semantic context
3. if still ambiguous, emit a warning
4. only then consider an explicit manual override mechanism as a fallback, not the default workflow

### 7.6 Persisted id map

To improve stability across repeated exports, exporter may keep a sidecar mapping file that stores previously assigned technical ids for semantic signatures.

This is recommended but not required for the first implementation pass.

### 7.7 Current exporter mismatch

The current exporter heavily relies on cleaned node names as identity. For v2, name-derived values should primarily become `label`, while technical `id` should come from automatic semantic matching.

---

## 8. Primitive node mapping

This section defines the basic mapping for primitive/intrinsic node types.

### 8.1 `GROUP` and `FRAME`

Default mapping:
- `GROUP` → `container`
- `FRAME` → `container`

Notes:
- current exporter maps many frames/groups to `SuperContainer` or `AutoLayout`
- in v2, those are not base schema concepts
- if a frame is intentionally exported as a runtime custom type like `AutoLayout`, that should be an explicit mapping rule, not the default

### 8.2 `TEXT`

Default mapping:
- `TEXT` → `text`

Exported basic fields:
- `id`
- `label`
- `type: "text"`
- `x`, `y`
- `visible`
- `alpha`
- `rotation`
- `anchorX`, `anchorY` when derived
- `text`
- `style` as full object
- `maxWidth` when applicable
- `fit` when applicable later

Current relevant extractor:
- `extractTextProps()` already builds a solid base for this

### 8.3 Shape/vector nodes

Initial mapping:
- `RECTANGLE` → `graphics`
- `ELLIPSE` → `graphics`
- `VECTOR` → `graphics`

Exported type-specific fields should include:
- `shape`
- `width`, `height` when applicable
- `fill`
- `stroke`
- `strokeWidth`
- `radius`
- `points` when needed later

### 8.4 Raster/image-backed nodes

For v2 there is no separate `image` type.

Initial mapping:
- image-like exported visual → `sprite`

Open point:
- we still need an explicit rule for when a Figma node becomes `sprite` instead of `graphics`
- the current exporter often turns rectangles/vectors into engine-specific visual types rather than a clean `sprite` vs `graphics` split

This needs a dedicated mapping rule in a later iteration.

### 8.5 `INSTANCE`

For v2, a Figma instance should export as a node whose `type` is the concrete prefab/runtime type name.

Example:

```json
{
  "id": "volumeSlider",
  "type": "Slider.portrait"
}
```

Not:

```json
{
  "id": "volumeSlider",
  "type": "component",
  "ref": "Slider.portrait"
}
```

The current exporter still uses old instance semantics (`type + isInstance + variant + componentProperties`). This should be simplified for v2.

---

## 9. Basic extracted fields

The following are the initial basic exported parameters for v2 mapping.

### 9.1 Common base fields

Export when applicable:
- `id`
- `label`
- `type`
- `x`
- `y`
- `scaleX`
- `scaleY` (if later reintroduced by explicit rule)
- `rotation`
- `alpha`
- `visible`
- `anchorX`
- `anchorY`
- `pivotX`
- `pivotY`
- `zIndex`
- `children`
- `meta`
- `extras`
- `props`

### 9.2 Current code observations

Current exporter behavior to revisit:
- `extractCommonProps()` currently exports `width/height` in some special cases and converts rotation to `angle`
- Scene Config v2 uses `rotation`, not `angle`
- size export should become type-specific
- legacy scale-marker behavior (`*`, `[scaled]`, `@size`) should likely not survive into v2 unchanged

### 9.3 Rotation

Current code converts Figma radians into degrees (`angle`).

For Scene Config v2 this must be normalized to the final schema decision:
- either `rotation` in radians
- or `rotation` in degrees

This remains an open schema question and exporter must follow the final schema choice.

---

## 10. Text mapping

Text export should remain one of the simplest and most explicit mappings.

### Rule

A Figma text node exports to:

```json
{
  "id": "title",
  "type": "text",
  "text": "Hello",
  "style": {
    "fontFamily": "Inter",
    "fontSize": 32,
    "fontWeight": 700,
    "lineHeight": 38,
    "align": "center",
    "fill": "#ffffff"
  }
}
```

### Style policy

For v2:
- `style` is a full inline object
- exporter should not emit style references as the default mapping layer behavior

This matches the current scene schema decision.

---

## 11. Mask mapping

Mask export must follow `docs/scene-config-v2.md`.

### Rule

If a node is masked, exporter should emit:
- the mask source as a normal node (`sprite` or `graphics`)
- `mask: "maskNodeId"` on the target node

### Important change from current exporter

The current exporter may inject synthetic mask nodes for `FRAME.clipsContent`.

For v2:
- exporter should avoid hidden synthetic runtime-only structures where possible
- mask relationships should be represented explicitly in schema terms

Exactly how to derive mask bindings from Figma should be finalized in a later iteration.

---

## 12. Things the v2 exporter should stop doing by default

Compared to the current exporter, v2 should move away from these defaults:

- exporting `SuperContainer`
- exporting `Component`
- exporting `Scene` as a runtime type
- exporting `AutoLayout` as an implicit base mapping for frames
- exporting `CheckBoxComponent`, `ValueSlider`, `ScrollBox`, `Reels`, etc. as hidden schema concepts by default
- flattening runtime widget semantics into schema unless explicitly intended
- relying on `_ph` suffix as a hidden runtime contract
- injecting synthetic masks without explicit schema-level meaning
- relying only on cleaned display names as stable cross-mode ids

Some of these may still exist as explicit runtime/custom types, but they should no longer be the default mapping layer.

---

## 13. Basic parameters for first implementation pass

The first implementation pass of the v2 Figma mapping should focus only on:

1. scene detection
2. mode detection
3. prefab detection
4. stable ids strategy
5. primitive node mapping
6. semantic label extraction
7. text style extraction
8. explicit mask export model

Everything else should be postponed until the basic mapping is stable.

---

## 14. Open questions

1. What exact Figma structure should define scene modes?
2. Should we persist a semantic-signature → technical-id map between exports?
3. When should a visual node export as `sprite` vs `graphics`?
4. Which current special processors should survive as explicit runtime/custom type mappings?
5. How should Figma component-set naming map to final prefab names?
6. Which current exporter heuristics must be removed completely versus kept as optional compatibility helpers?
7. Do we still need a manual fallback marker for ambiguous cross-mode matching cases?
