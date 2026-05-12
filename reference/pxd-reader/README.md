# PXD reader — demo & usage examples

A browser demo and a small gallery of usage snippets for the [`pxd`](../../libs/pxd/) library — the minimal PXD v1 (Core + Library) reader/applier for Pixi.js.

This folder is **not** a separate reader implementation. It depends on `libs/pxd` and exists purely to show how to wire the library into a real Pixi.js application.

Spec: [`libs/pxd/doc/pxd-v1.md`](../../libs/pxd/doc/pxd-v1.md).

## Quickstart

```bash
# Build the library it depends on (once, or whenever libs/pxd changes).
cd ../../libs/pxd && npm install && npm run build

cd ../../reference/pxd-reader
npm install
npm run build
npm run demo:serve   # http://localhost:8080/reference/pxd-reader/
```

`npm install` resolves `pxd` from `file:../../libs/pxd`, so the local sources are used directly.

## What the demo shows

The browser entry (`src/demo.ts`) walks through the four headline features:

1. **`build(doc, opts)`** — turn a Core document into a fresh Pixi tree.
2. **`requirePath(root, "hud.bet.value")`** — look up a child by dotted label path.
3. **`mountSlot(root, "logo", child)`** — drop external content into a named `slot` node.
4. **`apply(doc, root, opts)`** — patch the live tree with a new document. The demo applies a "patched" version after two seconds; text, colours and positions update in place without rebuilding.

## Example snippets

Each file under `src/examples/` is a standalone, commented module focused on one feature. They are not executed by the browser demo; they exist as copy-pasteable reference code.

| File | Demonstrates |
|---|---|
| `examples/custom-type.ts`           | Registering a runtime-registered node type via `builders` Map. Default builders extended, not replaced. |
| `examples/prefabs.ts`               | Library profile — reusable named trees, including transitive prefab → prefab references. |
| `examples/decisions-bindings.ts`    | §3.6 decision values (`activeTags`) and §7.2 string bindings (`{path}`). |
| `examples/slots-and-find.ts`        | `slot` nodes, `mountSlot`, `requirePath` / `findAll` label-path lookup. |
| `examples/apply-hot-reload.ts`      | `apply` as a stylesheet — theme/locale swap on a built tree. |

## Public API (cheat sheet)

```ts
import {
    build, apply,
    find, findAll, requirePath,
    getSlot, mountSlot,
    defaultBuilders, defaultAppliers,
    type NodeBuilder, type NodeApplier,
} from "pxd";
```

- `build(doc, opts)` — validate + construct a Pixi tree.
- `apply(doc, root, opts)` — patch an existing tree. Missing nodes → `onMissing`, type mismatches silently skip type-specific fields.
- `find` / `findAll` / `requirePath` — dotted-label lookup over `Container.label`.
- `getSlot` / `mountSlot` — slot mounting by `slot` tag (label-independent).
- `defaultBuilders` / `defaultAppliers` — the per-type registries you extend to add custom node types.

See [`libs/pxd/README.md`](../../libs/pxd/README.md) for the full API surface and design contract.

## Layout

```
reference/pxd-reader/
├── package.json
├── tsconfig.json
├── index.html
├── README.md
└── src/
    ├── demo.ts                       # Browser entry — build + find + mountSlot + apply
    └── examples/
        ├── custom-type.ts            # Registering a custom node type
        ├── prefabs.ts                # Library profile + transitive composition
        ├── decisions-bindings.ts     # activeTags + binding resolver
        ├── slots-and-find.ts         # Slots + label-path lookup
        └── apply-hot-reload.ts       # apply() for live patching
```

## Relationship to the rest of the monorepo

This folder depends only on [`libs/pxd`](../../libs/pxd/) and `pixi.js`. It does **not** import from `modules/engine/`, `modules/slots/`, `games/`, or `tools/figma/`. Dropping `libs/pxd/` together with this folder into another repository should work without the rest of the engine.

Conformance fixtures and the canonical TypeScript schema live next to the library:

- Spec: `libs/pxd/doc/pxd-v1.md`
- Fixtures: `libs/pxd/doc/fixtures/{valid,invalid}/*.json`
- Library tests: `libs/pxd/test/*.test.ts` — these exercise validation, build, apply, find, and slots; this folder no longer duplicates them.
