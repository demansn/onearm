# PXD v1 — Core Reader (Reference)

A minimal reference implementation of the PXD v1 **Core profile** reader, for any Pixi.js application.

Specification: [`docs/pxd-v1.md`](../../docs/pxd-v1.md) (Part I).

## What this provides

- `src/validate.ts` — profile-aware validator covering Core (§10), Library (§15), and Scene (§20) rules. Throws `ValidationError` with a rule reference on the first violation.
- `src/core-reader.ts` — Core-shape reader that turns a validated document into a Pixi.js display tree. Extensible via a type-builder registry and extension handlers.
- `src/library-reader.ts` — Library-shape reader: Core + reusable named trees (prefabs), with transitive composition and per-instance identity scope.
- `src/demo.ts` + `index.html` — browser demo that renders an inline document via Pixi.js Application.
- `test/run-fixtures.ts` — walks the conformance fixtures at `docs/fixtures/pxd-v1/` and asserts that valid docs validate and invalid docs are rejected.
- `test/smoke.test.ts` — runtime smoke tests for registry and extension-handler APIs (`node:test`).
- `test/library.test.ts` — runtime tests for the Library reader (`node:test`).

## Scope

- **Core and Library profiles.** The Core reader (`readCoreDocument`) accepts core-shape documents. The Library reader (`readLibraryDocument`) accepts core-shape AND library-shape documents — it is a superset. Scene profile is not yet implemented; scene-shape documents are rejected.
- **Default builders:** `container`, `sprite`, `text`, `graphics`, `slot`. Other intrinsic types the spec lists and runtime-registered types must be registered explicitly.
- **Decision values (§3.6)** are resolved against an `activeTags` set you pass in — one document, many contexts (language, platform, theme).
- **String bindings (§7.2)** — `{path}` substitutions in any string value — are resolved through a host-supplied `binding` callback.
- **Document-level `extensions`** (at the root) are ignored — asset/resource loading is the caller's concern. Per-node `extensions` are dispatched to registered handlers.

## Quickstart

```bash
cd reference/pxd-reader
npm install
npm test           # validates against docs/fixtures/pxd-v1/
npm run build
npm run demo:serve # serves index.html on http://localhost:8080
```

## Using it in your own Pixi.js app

```ts
import { Application, Assets } from "pixi.js";
import { readCoreDocument } from "./core-reader.js";

const docJson = await (await fetch("./layout.json")).json();
const app = new Application();
await app.init({ width: 1280, height: 720 });
document.body.appendChild(app.canvas);

const root = readCoreDocument(docJson, {
    resolve: {
        texture: (id) => Assets.get(id),
        style: (id) => yourStyleTable[id],
    },
});
app.stage.addChild(root);
```

## Registering a custom node type

Need a node type the defaults don't cover (a runtime-registered widget such as `Button`, or an intrinsic type the spec marks MAY such as `spine`)? Register a builder.

```ts
import { Container } from "pixi.js";
import { readCoreDocument, type NodeBuilder } from "./core-reader.js";
import { MyButton } from "./my-button.js";

const buildButton: NodeBuilder = (node, _ctx) => {
    // `props` is the runtime-registered construction bag from spec §5.
    const props = (node as { props?: { label?: string } }).props ?? {};
    return new MyButton(props.label ?? "");
};

const root = readCoreDocument(docJson, {
    resolve: { texture: (id) => Assets.get(id) },
    builders: new Map([["Button", buildButton]]),
});
```

Builders override defaults on key collision — you can replace `text` with a custom BitmapText-backed builder the same way.

Builder contract:
- Return any `Container` (or subclass; `Sprite`, `Text`, `Graphics` all extend `Container`).
- Do NOT apply base fields (`x`, `y`, `scale`, etc.) — the dispatcher does that after your builder returns.
- Recurse into children via `ctx.buildChild(child)`; do NOT call `buildNode` directly.

## Library profile: reusable prefab trees

Library documents add a top-level `prefabs` map of named reusable trees. A node whose `type` matches a prefab name instantiates that prefab in a fresh identity scope (§13.2). Transitive composition (prefab references prefab) works out of the box.

```ts
import { readLibraryDocument } from "./library-reader.js";

const docJson = {
    format: "pxd",
    version: 1,
    prefabs: {
        "Button.primary": {
            id: "root",
            type: "container",
            children: [
                { id: "bg", type: "sprite", texture: "btn_bg" },
                { id: "caption", type: "text", text: "" },
            ],
        },
    },
    root: {
        id: "root",
        type: "container",
        children: [
            { id: "playBtn", type: "Button.primary", x: 100, y: 50 },
            { id: "quitBtn", type: "Button.primary", x: 100, y: 120 },
        ],
    },
};

const root = readLibraryDocument(docJson, {
    resolve: { texture: (id) => Assets.get(id) },
});
app.stage.addChild(root);
```

Notes:
- `readLibraryDocument` also accepts core-shape documents (Library ⊇ Core). Rejects scene-shape.
- Each prefab instance gets its own identity scope — masks inside a prefab resolve locally; the same prefab instantiated twice produces distinct Container subtrees.
- Prefab names MUST NOT collide with intrinsic or runtime-registered types (§12.1). The reader enforces this defensively at load time.
- Reference-node base fields (`x`, `y`, `alpha`, ...) apply to the instantiated prefab root and override any corresponding fields on the prefab root itself.

## Registering an extension handler

Per-node `node.extensions[id]` payloads are dispatched to registered handlers. This implements the extension mechanism defined in spec §9.

```ts
import { readCoreDocument, type ExtensionHandler } from "./core-reader.js";

const physicsHandler: ExtensionHandler = (payload, target, _node, _ctx) => {
    const spec = payload as { shape: "circle"; radius: number };
    world.addBody(target, spec);
};

const root = readCoreDocument(docJson, {
    resolve: { texture: (id) => Assets.get(id) },
    extensions: new Map([["VENDOR_physics", physicsHandler]]),
});
```

Handler contract:
- Runs AFTER the builder and AFTER base fields (`x`, `y`, `alpha`, etc.) have been applied. May override them.
- Multiple handlers for one node run in insertion order of `node.extensions` keys (document order).
- Unknown extensions are silently ignored — per spec §9.3, a reader that does not recognize an `extensionsUsed` identifier MUST still load the document.

## String bindings (§7.2)

Any string value in a document MAY contain `{path}` bindings — the reader substitutes them before passing the string on to the typed resolvers (texture, style). Register a binding resolver and the reader handles the rest.

```ts
const localeTable: Record<string, string> = {
    "locale.title": "Gates of Olympus",
    "locale.coins": "monedas",
    "settings.bet": "10",
};

const root = readCoreDocument(docJson, {
    resolve: {
        texture: (id) => Assets.get(id),
        style: (id) => styleTable[id],
        binding: (path) => localeTable[path] ?? `[${path}]`,
    },
});
```

The corresponding document:

```json
{
  "id": "betLabel", "type": "text",
  "text": "Bet: {settings.bet} {locale.coins}"
}
{
  "id": "title", "type": "text",
  "text": "{locale.title}",
  "style": "{locale.h1}"
}
```

Notes:
- Bindings are resolved BEFORE typed resolvers. `texture: "{locale.flag}"` runs through `binding` first, then the resulting string goes to `texture`.
- A literal `{` is escaped as `\{`. A literal `\` before `{` is `\\`.
- If no `binding` resolver is registered, occurrences are left unchanged — per spec §11 (tolerant default), with escapes still processed.
- Substituted values are NOT re-scanned for further bindings.

## Decision values (§3.6)

Any scalar field of a node MAY be a *decision map* — `{ "_": default, "<tag>": value, "<tag1>+<tag2>": value }` — selected against an active tag set you pass in. One document, many contexts (language, platform, theme).

```ts
const root = readCoreDocument(docJson, {
    resolve: { texture: (id) => Assets.get(id) },
    activeTags: ["de", "mobile"], // host-defined: language + form factor + anything else
});
```

The corresponding document:

```json
{
  "id": "title", "type": "text", "text": "Hello",
  "x": { "_": 100, "mobile": 50 },
  "maxWidth": { "_": 320, "de": 400, "de+mobile": 360 }
}
```

With `["de", "mobile"]` active, this produces `x = 50` (single tag matches), `maxWidth = 360` (most-specific combination wins). With `["de"]` only — `x = 100`, `maxWidth = 400`. With no tags — defaults.

Rules:
- Selector tags MUST be lexicographically sorted (`"de+mobile"`, NOT `"mobile+de"`) — the reader enforces and the validator rejects unsorted keys.
- Highest specificity (most tags) wins. Ties break on declaration order — first matching selector wins.
- All values in one decision map MUST share the same primitive type (number, string, or boolean).
- Decision values are forbidden on `id`, `type`, `mask`, `children`, `extensions`, `props` — these stay static.
- Decision values resolve BEFORE bindings: pick the leaf, then resolve any `{path}` in it.

## Implementation notes

- The reader separates validation from construction. `readCoreDocument` calls `validate` first, then builds the tree from a trusted structure.
- Dispatch order per node: `builder(node, ctx)` → `applyBaseFields` → `runExtensions`. Fixed contract documented in JSDoc.
- Masks are resolved in a second pass after the full tree is built, so forward references work regardless of declaration order.
- `core-reader.ts` is ≈170 executable lines of typed TypeScript covering every default intrinsic type, base-field application, forward-reference mask resolution, a pluggable type registry, and extension-handler dispatch. A stripped-down minimum reader (container / sprite / text only, no masks, no extensions, no registry) fits in well under 50 lines.

## Layout

```
reference/pxd-reader/
├── package.json
├── tsconfig.json
├── index.html
├── README.md
├── src/
│   ├── types.ts           # Vendored subset of the PXD v1 TS schema
│   ├── validate.ts        # §10 / §15 / §20 validation
│   ├── core-reader.ts     # Core-profile reader: registry + extension hooks
│   ├── library-reader.ts  # Library-profile reader: prefabs + transitive composition
│   └── demo.ts            # Browser demo
└── test/
    ├── run-fixtures.ts    # Fixture validator (plain Node script)
    ├── smoke.test.ts      # Registry + extensions runtime tests (node:test)
    └── library.test.ts    # Library reader runtime tests (node:test)
```

## Relationship to the rest of the monorepo

This module is self-contained. It depends only on `pixi.js`. It does NOT import from `modules/engine/`, `modules/slots/`, `games/`, or `tools/figma/`. Dropping the folder into another repository and running `npm install && npm test` should work unchanged.

The canonical TypeScript schema lives at `tools/figma/src/schema/pxd-v1.schema.ts` and is kept in sync with `src/types.ts` here by hand. The vendored copy exists so the reference stays self-contained; if the spec changes, update both.
