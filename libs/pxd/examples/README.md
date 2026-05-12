# Examples

## `hud-doc.json`

A realistic slot-game HUD document — Library profile with an `InfoPill` prefab,
a `Reels` slot mount point, runtime-registered `SpinButton` / `IconButton`
controls, decision values for mobile/desktop, locale-swappable big-win text,
and a binding for the win amount.

Use it as a starting point or as a validator/build test bed. Pair it with the
following `nodeTypes` registry:

```ts
import { build, defaultNodeTypes } from "pxd";
import { Assets } from "pixi.js";
import hudDoc from "./hud-doc.json" with { type: "json" };

const root = build(hudDoc, {
    resolve: {
        texture: (id) => Assets.get(id),
        style:   (id) => textStyles[id],
        binding: (path) => i18n.t(path),
    },
    activeTags: isPortrait ? ["mobile", "en"] : ["desktop", "en"],
    nodeTypes: new Map([
        ...defaultNodeTypes,
        ["SpinButton",  SpinButtonType],
        ["IconButton",  IconButtonType],
    ]),
});

mountSlot(root, "Reels", reelsContainer);
```

## `hot-reload-demo.html`

A self-contained browser demo. Open the file directly (or serve the `libs/pxd`
folder) — needs `dist/` built (`npm run build` inside `libs/pxd/`).

Features:
- Toggle `mobile` / `dark` tags → `apply` re-resolves all decision values.
- Cycle locale (`en` / `ru` / `de`) → `apply` re-resolves text decisions.
- Randomize positions → mutates the doc and `apply`s — proves the same
  Container instances get updated without rebuild.

Useful as a reference for wiring `apply` into a dev workflow.
