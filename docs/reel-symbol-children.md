# ReelSymbol Declarative Children

ReelSymbol uses a declarative `children` array in symbol data to define its visual structure. Each child is created via `ObjectFactory.createObject()` and added to the symbol's `content` container.

## Config Format

Symbol data is defined in `symbolsConfig` (game-specific). Each symbol has a `children` array describing its display objects:

```js
{
    name: "S1", id: 10,
    children: [
        { type: "spine", label: "frame",  spine: "gool_winframe", animation: "gool_winframe", scale: { x: 0.15, y: 0.15 } },
        { type: "spine", label: "body",   spine: "gool_hv_1", animation: "gool_hv_1", scale: { x: 0.15, y: 0.15 } },
        { type: "spine", label: "effect", spine: "gool_overlay_effect", animation: "gool_overlay_effect", scale: { x: 0.15, y: 0.15 } },
        { type: "EngineText", label: "multiplier", text: "X2", style: { fontSize: 32, fill: "white" }, maxWidth: 80 },
        { type: "s_symbol_glow", label: "glow", anchor: [0.5, 0.5] },
    ],
    zIndex: 100,
}
```

## Supported Child Types

| `type` | Creates | Notes |
|---|---|---|
| `"spine"` | SpineTimeline | GSAP-controlled spine, no auto-update |
| `"SpineAnimation"` | SpineAnimation | Auto-updating spine |
| `"Text"` | PIXI Text | Built-in |
| `"EngineText"` | EngineText | Auto-scales text to fit `maxWidth` |
| `"Graphics"` | PIXI Graphics | Built-in |
| `"Rectangle"` | Rectangle | Built-in |
| `"BaseContainer"` | BaseContainer | Built-in |
| `"s_texture_name"` | Sprite | Fallback: any unrecognized type is treated as texture name |

## Child Object Properties

- `type` — resolved by ObjectFactory (see table above)
- `label` — string identifier, used for `find()` lookups
- `parameters` — optional object, flattened into constructor props
- Display properties (`scale`, `anchor`, `x`, `y`, etc.) are flat in the child object

## Conventions

- `label: "body"` — the main symbol spine. Accessible via the `symbol.spine` getter
- Children are added to `symbol.content` (a centered BaseContainer), not to the symbol root

## Accessing Children

```js
symbol.find("body")        // → SpineTimeline (the main spine)
symbol.find("multiplier")  // → EngineText
symbol.find("frame")       // → SpineTimeline
symbol.spine               // → alias for find("body")
```

`find()` is inherited from `BaseContainer` and searches children recursively by `label`.

## SpineTimeline.animation

SpineTimeline stores the animation name passed to its constructor as a public `animation` field. Animation clips use this to replay the default animation:

```js
const body = symbol.spine;
body.animation  // → "gool_hv_1"
body.timeline({ animation: body.animation, timeScale })
```

## gotToIdle()

Resets all children to their initial state. Iterates `content.children` and for each child:

- Kills GSAP tweens
- Resets `alpha` to 1, `visible` to true
- Calls `goToStart(obj.animation)` if the child has both `goToStart` and `animation` (duck typing for SpineTimeline)

## Example Animation Clip

```js
export function symbolWin(symbol, { timeScale = 1.5, skip = false } = {}) {
    const tl = gsap.timeline();
    const body = symbol.find("body");
    const frame = symbol.find("frame");
    const effect = symbol.find("effect");

    tl.add(body.timeline({ animation: body.animation, timeScale }));
    if (frame) tl.add(frame.timeline({ animation: frame.animation, timeScale }), 0);
    if (effect) tl.add(effect.timeline({ animation: "gool_cascading_effect", timeScale }), "-=0.1");
    return tl;
}
```

Clips access children by label, check for existence (not all symbols have all children), and compose SpineTimeline `.timeline()` calls into a single GSAP timeline.
