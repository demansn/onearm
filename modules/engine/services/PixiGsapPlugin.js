import gsap from "gsap";
import { Service } from "./Service.js";

let currencyFormatterRef = null;
let layersRef = null;

gsap.registerPlugin({
    name: "money",
    init(target, config) {
        if (!target || typeof target.text === "undefined") return true;

        const isObject = typeof config === "object" && config !== null;
        const endValue = isObject ? config.value : config;
        const template = isObject ? config.template : null;

        this._target = target;
        this._start = parseFloat(String(target.text).replace(/[^0-9.-]/g, "")) || 0;
        this._end = endValue;
        this._change = endValue - this._start;
        this._template = template;
        return true;
    },
    render(progress, data) {
        const target = data._target;
        if (!target) return;

        let value;
        if (progress === 0) {
            value = data._start;
        } else if (progress === 1) {
            value = data._end;
        } else {
            value = data._start + data._change * progress;
        }

        const formatted = currencyFormatterRef ? currencyFormatterRef.format(value) : String(value);
        target.text = data._template ? data._template.replace("{money}", formatted) : formatted;
    }
});

gsap.registerPlugin({
    name: "parentLayer",
    init(target, value) {
        this._target = target || null;
        this._value = value;
        this._applied = false;
    },
    render(progress, data) {
        const target = data._target;
        if (!target) return;

        if (!data._applied || progress === 0) {
            let layer = null;
            if (data._value !== null && data._value !== "none") {
                layer = typeof data._value === "string" ? layersRef?.get(data._value) : data._value;
            }
            target.parentLayer = layer || null;
            data._applied = true;
        }
    }
});

/**
 * @description Service for custom GSAP PIXI properties
 */
export class PixiGsapPlugin extends Service {
    init() {
        currencyFormatterRef = this.services.get("currencyFormatter");
        layersRef = this.services.get("layers");
    }
}
