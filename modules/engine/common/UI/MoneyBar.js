import gsap from "gsap";

import { services } from "../../ServiceLocator.js";
import { SuperContainer } from "../displayObjects/SuperContainer";

import { LabelValue } from "./LabelValue";

export class MoneyBar extends SuperContainer {
    constructor({ title }) {
        super();

        this.label = new LabelValue({ title, value: 0, maxWidth: 130 });
        this._value = 0;
        this.addChild(this.label);

        this._timeline = new gsap.core.Timeline();
    }

    end() {
        this._timeline.kill();
        this._timeline = null;
    }

    set(value) {
        this._timeline.clear();

        this._value = value;
        this.label.value = this.formatValue(value);
    }

    animTo(to) {
        if (this._value === to) {
            return;
        }

        this._timeline.clear();

        const interp = gsap.utils.interpolate(this._value, to);
        const format = this.formatValue.bind(this);

        this._timeline.to(
            {},
            {
                duration: 1,
                onUpdate(label) {
                    label.value = format(interp(this.ratio));
                },
                onUpdateParams: [this.label],
                ease: "linear.inOut",
            },
        );

        this._value = to;
    }

    add(add, noAnimation) {
        if (noAnimation) {
            this.set(this._value + add);
            return;
        }

        this.animTo(this._value + add);
    }

    formatValue(value) {
        return services.currencyFormatter.format(value);
    }

    update(dt) {}
}
