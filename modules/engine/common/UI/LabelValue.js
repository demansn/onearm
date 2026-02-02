import { Container, Text } from "pixi.js";

export class LabelValue extends Container {
    constructor({ title, value = 0, maxWidth = 130 }) {
        super();

        this.titleText = new Text(title, {
            fontSize: 16,
            fill: 0xffffff
        });

        this.valueText = new Text(value.toString(), {
            fontSize: 16,
            fill: 0xffffff,
            fontWeight: 'bold'
        });

        this.addChild(this.titleText);
        this.addChild(this.valueText);

        this.maxWidth = maxWidth;
        this._value = value;

        this._layout();
    }

    _layout() {
        this.valueText.x = this.titleText.width + 10;

        const totalWidth = this.titleText.width + this.valueText.width + 10;
        if (totalWidth > this.maxWidth) {
            const scale = this.maxWidth / totalWidth;
            this.scale.set(scale);
        }
    }

    get value() {
        return this._value;
    }

    set value(val) {
        this._value = val;
        this.valueText.text = val.toString();
        this._layout();
    }
}
