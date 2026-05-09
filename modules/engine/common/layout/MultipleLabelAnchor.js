import { BaseContainer } from "../core/BaseContainer.js";

/**
 * MultipleLabelAnchor (MLA) — laying out children along one axis with
 * group anchor, optional auto-fit (proportionally scale all children when
 * total size exceeds maxSize), and pivot compensation.
 *
 * Port of NGUI/Pragmatic MultipleLabelAnchor. Works with any Container
 * (not just text) — measurement is done via getLocalBounds().
 *
 * Options:
 *   axis           "x" | "y"            stack axis. Default "x".
 *   spacing        number               gap between neighbours, can be negative.
 *   anchor         "begin"|"center"|"end"  group anchor along the axis.
 *   maxSize        number               cap for auto-fit (0 = no limit).
 *   fixedSize      number               container size along axis (0 = content-sized).
 *                                       NOTE: named fixedSize, not width — `width` is
 *                                       reserved by PIXI Container's getter/setter.
 *   ignoreInactive boolean              skip invisible children.
 *   ignoreScale    boolean              measure raw bounds, ignoring child.scale.
 *   anyPivots      boolean              compensate different pivots/anchors.
 *
 * @example Vertical stack centered, auto-fit to 400px:
 * const mla = new MultipleLabelAnchor({
 *     axis: "y", spacing: 12, anchor: "center", maxSize: 400,
 * });
 * mla.addChild(title, value, label);
 *
 * After mutating a child's text/visibility, call mla.refresh().
 */
export class MultipleLabelAnchor extends BaseContainer {
    #scaled = new WeakMap();

    constructor({
        axis = "x",
        spacing = 0,
        anchor = "center",
        maxSize = 0,
        fixedSize = 0,
        ignoreInactive = false,
        ignoreScale = true,
        anyPivots = true,
        ...props
    } = {}) {
        super(props);

        this.axis = axis;
        this.spacing = spacing;
        this.anchor = anchor;
        this.maxSize = maxSize;
        this.fixedSize = fixedSize;
        this.ignoreInactive = ignoreInactive;
        this.ignoreScale = ignoreScale;
        this.anyPivots = anyPivots;

        this.calculatedSize = 0;
    }

    refresh() {
        const axis = this.axis;
        const perp = axis === "y" ? "x" : "y";

        const allChildren = this.children;
        for (let i = 0; i < allChildren.length; i++) {
            const c = allChildren[i];
            const saved = this.#scaled.get(c);
            if (saved) {
                c.scale.set(saved.x, saved.y);
            }
        }

        const children = this.ignoreInactive
            ? allChildren.filter(c => c.visible)
            : allChildren;

        if (children.length === 0) {
            this.calculatedSize = 0;
            return;
        }

        const measurements = children.map(c => {
            const bounds = c.getLocalBounds();
            const raw = axis === "y" ? bounds.height : bounds.width;
            return {
                bounds,
                size: this.ignoreScale ? raw : raw * c.scale[axis],
            };
        });

        let total = measurements.reduce((acc, m) => acc + m.size, 0)
            + (children.length - 1) * this.spacing;

        if (this.maxSize > 0 && total > this.maxSize) {
            const fitScale = this.maxSize / total;
            for (let i = 0; i < children.length; i++) {
                const c = children[i];
                if (!this.#scaled.has(c)) {
                    this.#scaled.set(c, { x: c.scale.x, y: c.scale.y });
                }
                c.scale.set(c.scale.x * fitScale, c.scale.y * fitScale);
                measurements[i].size *= fitScale;
            }
            total = this.maxSize;
        }

        const groupSize = this.fixedSize > 0 ? this.fixedSize : total;

        let cursor;
        switch (this.anchor) {
            case "begin":
                cursor = -groupSize / 2;
                break;
            case "end":
                cursor = groupSize / 2 - total;
                break;
            case "center":
            default:
                cursor = -total / 2;
                break;
        }

        for (let i = 0; i < children.length; i++) {
            const c = children[i];
            const { bounds, size } = measurements[i];

            if (this.anyPivots) {
                const boundsMin = axis === "y" ? bounds.y : bounds.x;
                c[axis] = cursor - (boundsMin - c.pivot[axis]) * c.scale[axis];
            } else {
                c[axis] = cursor;
            }
            c[perp] = 0;

            cursor += size + this.spacing;
        }

        this.calculatedSize = total;
    }

    layout() {
        this.refresh();
    }

    addChild(...children) {
        const result = super.addChild(...children);
        this.refresh();
        return result;
    }

    removeChild(...children) {
        const result = super.removeChild(...children);
        for (const c of children) this.#scaled.delete(c);
        this.refresh();
        return result;
    }
}
