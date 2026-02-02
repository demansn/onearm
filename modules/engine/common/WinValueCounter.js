import gsap from "gsap";

/**
 * @class WinValueCounter
 */
export class WinValueCounter {
    /**
     * @param {object} param
     * @param {number} param.value
     * @param {number} param.duration
     * @param {PIXI.Text | PIXI.Text[]} param.text
     * @param {function} param.format
     */
    constructor({ value, duration, text, format = this.valueToText.bind(this) }) {
        this.value = value;
        this.duration = duration;
        this.text = text;
        this.timeline = new gsap.core.Timeline();
        this.format = format;
    }

    setWin(win) {
        this.timeline.clear();
        this.value = win;
        this.setTextValue(this.value);
    }

    addWin(win) {
        this.countTo(this.value + win);
    }

    countTo(to) {
        this.timeline.clear();

        return this.timeline.to(this, {
            value: to,
            duration: this.duration,
            onUpdate: () => {
                this.setTextValue(this.value);
            },
            ease: "linear.inOut",
        });
    }

    setTextValue(value) {
        if (this.text instanceof Array) {
            this.text.forEach(text => {
                text.text = this.format(value);
            });
        } else {
            this.text.text = this.format(value);
        }
    }

    valueToText(value) {
        return ` ${value} `;
    }

    stop(value) {
        this.timeline.kill();
        this.value = value;
        this.setTextValue(this.value);
    }
}
