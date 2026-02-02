import { CheckBox, RadioGroup } from "@pixi/ui";
import { SuperContainer } from "../displayObjects/SuperContainer.js";

export class DotsGroup extends SuperContainer {
    constructor({ size, on, off, scale = 1, elementsMargin = 0 }) {
        super();

        this.options = { on, off, scale, elementsMargin, type: "horizontal" };

        this.radioGroup = new RadioGroup({
            selectedItem: 0,
            items: this.createItems(size),
            type: this.options.type,
            elementsMargin,
        });
        this.addChild(this.radioGroup);
    }

    get onChange() {
        return this.radioGroup.onChange;
    }

    get size() {
        return this.radioGroup.items.length;
    }

    setItem(index) {
        if (index < 0 || index >= this.size) {
            return;
        }
        this.radioGroup.selectItem(index);
    }

    changeSize(size) {
        this.options.size = size;
        if (this.radioGroup) {
            this.radioGroup.removeItems(this.radioGroup.items.map((_, i) => i));
            this.radioGroup.addItems(this.createItems(size));
            this.radioGroup.options.items = this.radioGroup.items;
            this.radioGroup.selectItem(0);
        }
    }

    createItems(size) {
        const items = [];
        for (let i = 0; i < size; i++) {
            items.push(
                new CheckBox({
                    style: {
                        unchecked: typeof this.options.off === "function" ? this.options.off() : this.options.off,
                        checked: typeof this.options.on === "function" ? this.options.on() : this.options.on,
                    },
                }),
            );
        }
        return items;
    }
}
