import { Slider } from "@pixi/ui";
import { Graphics } from "pixi.js";

import { SuperContainer } from "../displayObjects/SuperContainer.js";

/**
 * SettingsSliderComponent
 * Компонент слайдера с настраиваемыми элементами:
 * - background: фон слайдера
 * - slider: ползунок
 * - fill: заполнение (опционально)
 * - textValue: текст значения (опционально)
 */
export class SettingsSliderComponent extends SuperContainer {
    constructor({
        background,
        slider,
        fill = new Graphics(),
        textValue = null,
        min = 0,
        max = 100,
        value = 50,
        step = 1,
    }) {
        super();



        this.slider = this.createObject(Slider, {
            bg: background,
            fill,
            slider,
            min,
            max,
            step,
            value,
        });

        // TODO: remove this after fix
        this.slider.y = background.y;
        this.slider.x = background.x;

        background.y = 0;
        background.x = 0;

        if (textValue) {
            this.textValue = this.addChild(textValue);
            this.textValue.text = value;
            this.slider.onUpdate.connect(value => {
                this.textValue.text = value;
            });
        }
    }

    setOptions(options) {
        if (options.min !== undefined) {
            this.slider.min = options.min;
        }
        if (options.max !== undefined) {
            this.slider.max = options.max;
        }
        if (options.step !== undefined) {
            this.slider.step = options.step;
        }
        if (options.value !== undefined) {
            this.value = options.value;
        }
    }

    get onChange() {
        return this.slider.onChange;
    }

    get onUpdate() {
        return this.slider.onUpdate;
    }

    get value() {
        return this.slider.value;
    }

    set value(val) {
        this.slider.value = val;

        if (this.textValue) {
            this.textValue.text = val;
        }
    }
}
