import { Slider } from "@pixi/ui";
import { Graphics } from "pixi.js";

import { AutoLayout } from "@slot/engine";

export class AutoplaySettingSlider extends AutoLayout {
    constructor({ min = 0, max = 100, value = 0, step = 1, width = 880 }) {
        super({
            flow: "horizontal",
            contentAlign: { x: "center", y: "center" },
            gap: 10,
        });

        const bg = new Graphics();
        bg.beginFill(0x000000, 0.2);
        bg.drawRoundedRect(0, 0, width, 13, 13);
        bg.endFill();

        const fill = new Graphics();
        fill.beginFill(0xffffff, 0.5);
        fill.drawRoundedRect(0, 0, width, 13, 13);
        fill.endFill();

        const slider = new Graphics();
        slider.beginFill(0xffffff, 1);
        slider.drawCircle(0, 0, 30);
        slider.endFill();

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
