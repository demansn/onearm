# Pixi Layout v1 — Conformance Fixtures

Test inputs for any Pixi Layout v1 reader implementation. Each fixture isolates one rule so that a failure can be diagnosed unambiguously.

Normative specification: `docs/pixi-layout-v1.md`.

## Layout

```
docs/fixtures/pixi-layout-v1/
├── valid/       # MUST load without error
└── invalid/     # MUST be rejected
```

## Valid fixtures

| File | Tests | Spec section |
|---|---|---|
| `valid/core-minimal.json` | Smallest loadable Core document | §2, §3, §4.1, §4.3 |
| `valid/core-full.json` | Every Core intrinsic type (`container`, `sprite`, `text`, `graphics`, `slot`); `profile: "core"` | §4 |
| `valid/core-mask-shared.json` | One mask referenced by multiple targets | §8 |
| `valid/core-extensions.json` | Extension declared in `extensionsUsed` but not `extensionsRequired`; document MUST load even if the reader does not recognize the extension | §9 |
| `valid/library-simple.json` | `prefabs` map, prefab instantiated twice, `profile: "library"` | §12, §13 |
| `valid/library-nested.json` | Prefab body references another prefab (transitive composition) | §13, §14 |
| `valid/scene-modes.json` | Two scene modes, cross-mode identity by stable `id`, `profile: "scene"` | §17, §18, §19 |
| `valid/scene-runtime-type.json` | Runtime-registered type (`Button`) with `props`; no prefabs | §5 |

## Invalid fixtures

| File | Violation | Spec rule |
|---|---|---|
| `invalid/wrong-format.json` | `format` is not `"pixi-layout"` | §10 rule 1 |
| `invalid/duplicate-ids.json` | Two sibling nodes share an `id` | §10 rule 5 |
| `invalid/mask-out-of-tree.json` | `mask` references an `id` that is not in the tree | §10 rule 6 |
| `invalid/non-composable-has-children.json` | `sprite` carries `children` | §10 rule 8 |
| `invalid/required-not-in-used.json` | `extensionsRequired` contains an id absent from `extensionsUsed` | §10 rule 9 |
| `invalid/extension-required-unsupported.json` | `extensionsRequired` contains an id not supported by the reader | §10 rule 10 |
| `invalid/prefab-cycle.json` | Prefab `A` references `B` which references `A` | §15 rule 15 |
| `invalid/prefab-ref-with-props.json` | A prefab reference carries `props` | §15 rule 17 |
| `invalid/prefab-ref-with-children.json` | A prefab reference carries `children` | §15 rule 17 |
| `invalid/mixed-root-and-scenes.json` | Document has both `root` and `scenes` | §20 rule 22 |
| `invalid/empty-modes.json` | Scene has an empty `modes` object | §20 rule 20 |
| `invalid/profile-mismatch.json` | `profile: "core"` but document contains `prefabs` | §2.1, §10 rule 12 |

## Using the fixtures

A reader implementation SHOULD run every valid fixture through its load path and expect success, and run every invalid fixture through its load path and expect rejection with an error that cites the violated rule.

The reference implementation at `reference/pixi-layout-reader/` demonstrates this pattern.

## Adding new fixtures

- Keep each fixture minimal; exercise exactly one rule.
- Prefer human-readable ids, textures, and labels.
- Update this README when adding or removing fixtures.
