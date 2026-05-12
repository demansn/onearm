/**
 * Example: registering a custom node type.
 *
 * `pxd` ships default builders for `container`, `sprite`, `text`, `graphics`,
 * and `slot`. Any other type name in a document is treated as a runtime-
 * registered type (§3.5) — the host MUST supply a builder for it.
 *
 * A builder receives the resolved node (decision-map values already collapsed,
 * string bindings still raw — call `ctx.readString` to resolve them) and
 * returns a Pixi `Container` (or subclass). Base fields (`x`, `y`, `scale`, …)
 * are applied by the framework AFTER the builder returns.
 */
import { Container, Graphics } from "pixi.js";
import { build, defaultBuilders, type NodeBuilder } from "pxd";
import type { CoreDocument } from "pxd";

/**
 * A toy `Button` widget. In a real app this would be a Container subclass
 * with its own internal layout, hit area, sound, etc. — text rendering is
 * skipped here so the example carries no font dependency.
 */
class Button extends Container {
    constructor() {
        super();
        const bg = new Graphics().roundRect(0, 0, 160, 48, 8).fill("#fbbf24");
        this.addChild(bg);
    }
}

/**
 * Builder for the `Button` runtime type. `node.props` is the §5 prop bag —
 * read it for construction-time configuration. (PXD sets `Container.label`
 * after this returns, so don't write `this.label` from the constructor.)
 */
const buildButton: NodeBuilder = (node) => {
    const _props = (node.props ?? {}) as { label?: string };
    return new Button();
};

const doc: CoreDocument = {
    format: "pxd",
    version: 1,
    root: {
        id: "root",
        type: "container",
        children: [
            {
                id: "play",
                type: "Button",
                x: 100, y: 100,
                props: { label: "Play" },
            },
            {
                id: "quit",
                type: "Button",
                x: 100, y: 160,
                props: { label: "Quit" },
            },
        ],
    },
};

export function buildScene(): Container {
    return build(doc, {
        resolve: { texture: () => ({} as never) },
        builders: new Map([
            ...defaultBuilders,
            ["Button", buildButton],
        ]),
    });
}
