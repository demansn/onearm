import { Graphics } from "pixi.js";
import { Signal } from "typed-signals";
import { BaseContainer } from "../core/BaseContainer.js";

/**
 * Unified Slider component.
 * Replaces CustomSlider and ValueSlider with a single configurable class.
 *
 * Supports two initialization modes:
 * 1. Direct: pass display objects (bg, fill, slider) in constructor
 * 2. Layout: call init() after children are added, finds them by name (SliderBG, SliderFill, SliderBtn)
 *
 * Supports both continuous ranges and discrete step arrays.
 *
 * @example Direct mode (like old CustomSlider):
 * new Slider({ bg: bgSprite, fill: fillSprite, slider: btnSprite, min: 0, max: 100, value: 50 });
 *
 * @example Layout mode (like old ValueSlider):
 * const slider = new Slider();
 * // ... add children from layout ...
 * slider.init({ steps: [0.5, 1, 2, 5, 10] });
 *
 * @example Discrete steps:
 * new Slider({ bg, fill, slider, steps: [10, 25, 50, 100, 200] });
 */
export class Slider extends BaseContainer {
    constructor({
        bg = null,
        fill = null,
        slider = null,
        min = 0,
        max = 100,
        value = 0,
        step = 1,
        steps = null,
    } = {}) {
        super();

        this.onUpdate = new Signal();
        this.onChange = new Signal();

        this._value = value;
        this._index = 0;
        this._stepsArray = null;
        this.dragging = false;
        this.dragData = null;

        // Direct mode: display objects passed to constructor
        if (bg && fill && slider) {
            this.bg = bg;
            this.fill = fill;
            this.btn = slider;

            this.addChild(this.bg);
            this.addChild(this.fill);
            this.addChild(this.btn);

            if (steps && Array.isArray(steps)) {
                this._initStepsArray(steps, value);
            } else {
                this._stepsArray = null;
                this.min = min;
                this.max = max;
                this.step = step;
                this._value = value;
            }

            this._setupSlider();
        }
    }

    /**
     * Layout mode initialization.
     * Finds children by name (SliderBG, SliderFill, SliderBtn, ValueText).
     * @param {Object} options
     * @param {Array|Object} [options.steps] - Array of discrete values or { min, max, step, value }
     */
    init({ steps = { min: 0, max: 100, value: 100, step: 1 } } = {}) {
        this.bg = this.find("SliderBG");
        this.fill = this.find("SliderFill");
        this.btn = this.find("SliderBtn");
        this.valueText = this.find("ValueText");

        if (Array.isArray(steps)) {
            this._initStepsArray(steps);
        } else {
            this._stepsArray = null;
            this.min = steps.min;
            this.max = steps.max;
            this.step = steps.step;
            this._value = steps.value;
        }

        this._setupSlider();
    }

    _initStepsArray(steps, value) {
        this._stepsArray = steps;
        this._index = 0;
        this._value = value !== undefined ? value : steps[0];
        this.min = 0;
        this.max = steps.length - 1;
        this.step = 1;

        if (value !== undefined) {
            const index = steps.indexOf(value);
            this._index = index !== -1 ? index : 0;
            this._value = steps[this._index];
        }
    }

    _setupSlider() {
        this.startX = this.fill.x;
        this.endX = this.fill.x + this.fill.width - this.btn.width;

        this.createMask();
        this.setupInteraction();
        this.updatePosition();
    }

    /**
     * Change available steps/range dynamically.
     * @param {Array|Object} steps - Array of discrete values or { min, max, step }
     * @param {*} [value] - Value to set after changing steps
     */
    setSteps(steps, value) {
        if (Array.isArray(steps)) {
            this._stepsArray = steps;
            if (value !== undefined) {
                const index = steps.indexOf(value);
                this._index = index !== -1 ? index : 0;
                this._value = steps[this._index];
            } else {
                const currentValue = this._value;
                const index = steps.indexOf(currentValue);
                this._index = index !== -1 ? index : 0;
                this._value = steps[this._index];
            }
            this.min = 0;
            this.max = steps.length - 1;
            this.step = 1;
        } else {
            this._stepsArray = null;
            this.min = steps.min;
            this.max = steps.max;
            this.step = steps.step;
            if (value !== undefined) {
                this._value = Math.max(this.min, Math.min(this.max, value));
            }
        }

        if (this.fill && this.btn) {
            this.startX = this.fill.x;
            this.endX = this.fill.x + this.fill.width - this.btn.width;
            this.updatePosition();
        }
    }

    goToStart() {
        this.value = this._stepsArray ? this._stepsArray[0] : this.min;
    }

    goToEnd() {
        this.value = this._stepsArray ? this._stepsArray[this._stepsArray.length - 1] : this.max;
    }

    // --- Internal ---

    createMask() {
        this.fillMask = new Graphics();
        this.addChild(this.fillMask);
        this.fill.mask = this.fillMask;
    }

    setupInteraction() {
        this.btn.eventMode = "static";
        this.btn.cursor = "pointer";

        this.btn.on("pointerdown", this.onDragStart.bind(this));
        this.btn.on("pointerup", this.onDragEnd.bind(this));
        this.btn.on("pointerupoutside", this.onDragEnd.bind(this));

        this.bg.eventMode = "static";
        this.bg.cursor = "pointer";
        this.bg.on("pointerdown", this.onBackgroundClick.bind(this));

        this.fill.eventMode = "static";
        this.fill.cursor = "pointer";
        this.fill.on("pointerdown", this.onBackgroundClick.bind(this));
    }

    onDragStart(event) {
        this.dragging = true;
        this.dragData = event.data;

        const onMove = this.onDragMove.bind(this);
        const onEnd = this.onDragEnd.bind(this);

        const stage = this.getStage();
        if (stage) {
            stage.on("pointermove", onMove);
            stage.on("pointerup", onEnd);
            stage.on("pointerupoutside", onEnd);
        }

        this._onMove = onMove;
        this._onEnd = onEnd;
    }

    getStage() {
        let current = this;
        while (current.parent) {
            current = current.parent;
        }
        return current;
    }

    onDragMove(event) {
        if (!this.dragging) return;

        const globalPos = event.data.global;
        const localPos = this.toLocal(globalPos);
        this.updateFromPosition(localPos.x - this.btn.width / 2);
    }

    onDragEnd() {
        if (!this.dragging) return;

        this.dragging = false;

        if (this._onMove) {
            const stage = this.getStage();
            if (stage) {
                stage.off("pointermove", this._onMove);
                stage.off("pointerup", this._onEnd);
                stage.off("pointerupoutside", this._onEnd);
            }
            this._onMove = null;
            this._onEnd = null;
        }

        this.onChange.emit(this._value);
    }

    onBackgroundClick(event) {
        const globalPos = event.data.global;
        const localPos = this.toLocal(globalPos);
        this.updateFromPosition(localPos.x - this.btn.width / 2);
        this.onChange.emit(this._value);
    }

    updateFromPosition(x) {
        const clampedX = Math.max(this.startX, Math.min(this.endX, x));
        const newValue = this.positionToValue(clampedX);

        if (this._value !== newValue) {
            this._value = newValue;
            this.updatePosition();
            this.onUpdate.emit(this._value);
        }
    }

    updatePosition() {
        if (!this.btn || !this.fill) return;

        const btnX = this.valueToPosition(this._value);
        this.btn.x = btnX;
        this.updateMask();

        if (this.valueText) {
            this.valueText.text = this._value;
        }
    }

    updateMask() {
        if (!this.fillMask || !this.fill) return;

        const normalizedValue = this._stepsArray
            ? this._index / (this._stepsArray.length - 1)
            : (this._value - this.min) / (this.max - this.min);
        const maskWidth = normalizedValue * this.fill.width;

        this.fillMask.clear();
        this.fillMask.rect(this.fill.x, this.fill.y, maskWidth, this.fill.height).fill({ color: 0xffffff });
    }

    valueToPosition(value) {
        if (this._stepsArray) {
            const index = this._stepsArray.indexOf(value);
            this._index = index !== -1 ? index : 0;
            const normalizedValue = this._index / (this._stepsArray.length - 1);
            const sliderWidth = this.endX - this.startX;
            return this.startX + normalizedValue * sliderWidth;
        } else {
            const normalizedValue = (value - this.min) / (this.max - this.min);
            const sliderWidth = this.endX - this.startX;
            return this.startX + normalizedValue * sliderWidth;
        }
    }

    positionToValue(x) {
        const sliderWidth = this.endX - this.startX;
        const normalizedPosition = (x - this.startX) / sliderWidth;

        if (this._stepsArray) {
            const rawIndex = normalizedPosition * (this._stepsArray.length - 1);
            this._index = Math.max(0, Math.min(this._stepsArray.length - 1, Math.round(rawIndex)));
            return this._stepsArray[this._index];
        } else {
            const rawValue = normalizedPosition * (this.max - this.min) + this.min;
            const steppedValue = Math.round(rawValue / this.step) * this.step;
            return Math.max(this.min, Math.min(this.max, steppedValue));
        }
    }

    get value() {
        return this._value;
    }

    set value(val) {
        if (this._stepsArray) {
            const index = this._stepsArray.indexOf(val);
            if (index !== -1) {
                this._index = index;
                this._value = val;
            }
        } else {
            const clampedValue = Math.max(this.min, Math.min(this.max, val));
            if (this._value !== clampedValue) {
                this._value = clampedValue;
            }
        }
        this.updatePosition();
    }
}
