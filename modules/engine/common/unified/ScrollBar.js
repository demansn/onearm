import { Signal } from "typed-signals";
import { BaseContainer } from "../core/BaseContainer.js";

export class ScrollBar extends BaseContainer {
    constructor() {
        super();

        this.onScroll = new Signal();
        this.onChange = new Signal();

        this._value = 0;
        this._thumbRatio = 0.2;
        this._vertical = true;
        this.dragging = false;
    }

    init() {
        this.bg = this.find("SliderBg");
        this.fill = this.find("ScrollFill");

        if (!this.bg || !this.fill) {
            console.warn(`ScrollBar "${this.label}": missing required children (SliderBg, ScrollFill)`);
            return;
        }

        this._vertical = this.bg.height >= this.bg.width;
        this._setupInteraction();
        this._updateThumbPosition();
    }

    get value() {
        return this._value;
    }

    set value(val) {
        const clamped = Math.max(0, Math.min(1, val));
        if (this._value !== clamped) {
            this._value = clamped;
            this._updateThumbPosition();
        }
    }

    get thumbRatio() {
        return this._thumbRatio;
    }

    set thumbRatio(val) {
        this._thumbRatio = Math.max(0.01, Math.min(1, val));
        this._updateThumbSize();
        this._updateThumbPosition();
    }

    _getStage() {
        let current = this;
        while (current.parent) {
            current = current.parent;
        }
        return current;
    }

    _setupInteraction() {
        this.fill.eventMode = "static";
        this.fill.cursor = "pointer";
        this.fill.on("pointerdown", this._onThumbDown.bind(this));

        this.bg.eventMode = "static";
        this.bg.cursor = "pointer";
        this.bg.on("pointerdown", this._onTrackClick.bind(this));
    }

    _onThumbDown(event) {
        this.dragging = true;

        const local = this.toLocal(event.global);
        if (this._vertical) {
            this._dragOffset = local.y - this.fill.y;
        } else {
            this._dragOffset = local.x - this.fill.x;
        }

        const stage = this._getStage();
        const onMove = this._onDragMove.bind(this);
        const onEnd = this._onDragEnd.bind(this);

        stage.on("pointermove", onMove);
        stage.on("pointerup", onEnd);
        stage.on("pointerupoutside", onEnd);

        this._stageListeners = { stage, onMove, onEnd };
    }

    _onDragMove(event) {
        if (!this.dragging) return;

        const local = this.toLocal(event.global);
        const trackSize = this._vertical ? this.bg.height : this.bg.width;
        const thumbSize = this._vertical ? this.fill.height : this.fill.width;
        const maxTravel = trackSize - thumbSize;

        if (maxTravel <= 0) return;

        const trackStart = this._vertical ? this.bg.y : this.bg.x;
        const pos = (this._vertical ? local.y : local.x) - this._dragOffset - trackStart;
        const newValue = Math.max(0, Math.min(1, pos / maxTravel));

        if (this._value !== newValue) {
            this._value = newValue;
            this._updateThumbPosition();
            this.onScroll.emit(this._value);
        }
    }

    _onDragEnd() {
        if (!this.dragging) return;
        this.dragging = false;

        if (this._stageListeners) {
            const { stage, onMove, onEnd } = this._stageListeners;
            stage.off("pointermove", onMove);
            stage.off("pointerup", onEnd);
            stage.off("pointerupoutside", onEnd);
            this._stageListeners = null;
        }

        this.onChange.emit(this._value);
    }

    _onTrackClick(event) {
        const local = this.toLocal(event.global);
        const trackSize = this._vertical ? this.bg.height : this.bg.width;
        const thumbSize = this._vertical ? this.fill.height : this.fill.width;
        const maxTravel = trackSize - thumbSize;

        if (maxTravel <= 0) return;

        const trackStart = this._vertical ? this.bg.y : this.bg.x;
        const clickPos = (this._vertical ? local.y : local.x) - trackStart - thumbSize / 2;
        const newValue = Math.max(0, Math.min(1, clickPos / maxTravel));

        if (this._value !== newValue) {
            this._value = newValue;
            this._updateThumbPosition();
            this.onScroll.emit(this._value);
            this.onChange.emit(this._value);
        }
    }

    _updateThumbSize() {
        if (!this.bg || !this.fill) return;

        if (this._vertical) {
            this.fill.height = this.bg.height * this._thumbRatio;
        } else {
            this.fill.width = this.bg.width * this._thumbRatio;
        }
    }

    _updateThumbPosition() {
        if (!this.bg || !this.fill) return;

        const trackSize = this._vertical ? this.bg.height : this.bg.width;
        const thumbSize = this._vertical ? this.fill.height : this.fill.width;
        const maxTravel = trackSize - thumbSize;
        const offset = this._value * maxTravel;

        if (this._vertical) {
            this.fill.y = this.bg.y + offset;
        } else {
            this.fill.x = this.bg.x + offset;
        }
    }
}
