import { ScrollBox } from "@pixi/ui";
import { SuperContainer } from "../displayObjects/SuperContainer.js";

/**
 * ScrollBox component wrapper for LayoutBuilder
 * @extends SuperContainer
 */
export class ScrollBoxComponent extends SuperContainer {
    /**
     * @param {Object} options
     * @param {string} [options.name] - Component name
     * @param {number} options.width - ScrollBox width
     * @param {number} options.height - ScrollBox height
     * @param {string} [options.scrollType="vertical"] - Scroll direction ("vertical" or "horizontal")
     * @param {number} [options.elementsMargin=0] - Margin between elements
     */
    constructor({ name, width, height, scrollType, elementsMargin = 0, ...rest } = {}) {
        super();
        this.label = name;

        this.scrollBox = new ScrollBox({
            background: "rgba(0,0,0,0)",
            width,
            height,
            type: scrollType || "vertical",
            elementsMargin,
        });

        this.addChild(this.scrollBox);
    }

    /**
     * Add item to ScrollBox
     * @param {import("pixi.js").Container} item - Display object to add
     */
    addItem(item) {
        this.scrollBox.addItem(item);
    }

    /**
     * Remove all items from ScrollBox
     */
    removeItems() {
        this.scrollBox.removeItems();
    }

    /**
     * Scroll to specific position
     * @param {number} value - Target scroll position
     */
    scrollTo(value) {
        this.scrollBox.scrollTo(value);
    }

    /**
     * Resize ScrollBox to recalculate scroll boundaries after adding items
     */
    resize() {
        this.scrollBox.resize();
    }
}
