import { Slider } from "@pixi/ui";
import { Graphics } from "pixi.js";

import { Layout } from "../../../engine/index.js";

export class AutoplaySettingSlider extends Layout {
    constructor({ min = 0, max = 100, value = 0, step = 1, width = 880 }) {
        super({
            flow: "horizontal",
            contentAlign: { x: "center", y: "center" },
            gap: 10,
        });

        const bg = new Graphics();
        bg.roundRect(0, 0, width, 13, 13).fill({ color: 0x000000, alpha: 0.2 });

        const fill = new Graphics();
        fill.roundRect(0, 0, width, 13, 13).fill({ color: 0xffffff, alpha: 0.5 });

        const slider = new Graphics();
        slider.circle(0, 0, 30).fill({ color: 0xffffff, alpha: 1 });

        this.slider = this.createObject(Slider, {
            bg,
            fill,
            slider,
            min,
            max,
            step,
            value,
        });

        this.textValue = this.createObject("Text", { text: value, style: "" });
        this.layout();
    }

    get onChange() {
        return this.slider.onChange;
    }

    get value() {
        return this.slider.value;
    }

    set value(val) {
        this.slider.value = val;
    }
}
