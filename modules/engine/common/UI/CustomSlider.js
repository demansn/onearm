import { Container, Graphics } from "pixi.js";
import { Signal } from "typed-signals";

export class CustomSlider extends Container {
    constructor({
        bg,
        fill,
        slider,
        min = 0,
        max = 100,
        value = 100,
        step = 1,
    }) {
        super();

        this.bg = bg;
        this.fill = fill;
        this.btn = slider;
        this.min = min;
        this.max = max;
        this.step = step;
        this._value = value;

        this.dragging = false;
        this.dragData = null;

        this.onUpdate = new Signal();
        this.onChange = new Signal();

        this.addChild(this.bg);
        this.addChild(this.fill);
        this.addChild(this.btn);

        this.startX = this.fill.x;
        this.endX = this.fill.x + this.fill.width - this.btn.width;

        this.createMask();
        this.setupInteraction();
        this.updatePosition();
    }

    createMask() {
        this.fillMask = new Graphics();
        this.addChild(this.fillMask);
        this.fill.mask = this.fillMask;
    }

    setupInteraction() {
        this.btn.eventMode = 'static';
        this.btn.cursor = 'pointer';

        this.btn.on('pointerdown', this.onDragStart.bind(this));
        this.btn.on('pointerup', this.onDragEnd.bind(this));
        this.btn.on('pointerupoutside', this.onDragEnd.bind(this));

        this.bg.eventMode = 'static';
        this.bg.cursor = 'pointer';
        this.bg.on('pointerdown', this.onBackgroundClick.bind(this));

        this.fill.eventMode = 'static';
        this.fill.cursor = 'pointer';
        this.fill.on('pointerdown', this.onBackgroundClick.bind(this));
    }

    onDragStart(event) {
        this.dragging = true;
        this.dragData = event.data;

        const onMove = this.onDragMove.bind(this);
        const onEnd = this.onDragEnd.bind(this);

        const stage = this.getStage();
        if (stage) {
            stage.on('pointermove', onMove);
            stage.on('pointerup', onEnd);
            stage.on('pointerupoutside', onEnd);
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
                stage.off('pointermove', this._onMove);
                stage.off('pointerup', this._onEnd);
                stage.off('pointerupoutside', this._onEnd);
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
        const btnX = this.valueToPosition(this._value);
        this.btn.x = btnX;
        this.updateMask();
    }

    updateMask() {
        const normalizedValue = (this._value - this.min) / (this.max - this.min);
        const maskWidth = normalizedValue * this.fill.width;

        this.fillMask.clear();
        this.fillMask.rect(this.fill.x, this.fill.y, maskWidth, this.fill.height).fill({ color: 0xffffff });
    }

    valueToPosition(value) {
        const normalizedValue = (value - this.min) / (this.max - this.min);
        const sliderWidth = this.endX - this.startX;
        return this.startX + normalizedValue * sliderWidth;
    }

    positionToValue(x) {
        const sliderWidth = this.endX - this.startX;
        const normalizedPosition = (x - this.startX) / sliderWidth;
        const rawValue = normalizedPosition * (this.max - this.min) + this.min;
        const steppedValue = Math.round(rawValue / this.step) * this.step;
        return Math.max(this.min, Math.min(this.max, steppedValue));
    }

    get value() {
        return this._value;
    }

    set value(val) {
        const clampedValue = Math.max(this.min, Math.min(this.max, val));
        if (this._value !== clampedValue) {
            this._value = clampedValue;
            this.updatePosition();
        }
    }
}

