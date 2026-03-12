import { Text } from "pixi.js";

/**
 * EngineText — extended Text with auto-scaling to fit maxWidth.
 *
 * When text content exceeds maxWidth, the object scales down uniformly
 * to fit within the specified width constraint.
 *
 * Used automatically for Figma text nodes with fixed size (textAutoResize: NONE).
 */
export class EngineText extends Text {
    constructor({ maxWidth, ...options }) {
        super(options);
        this._maxWidth = maxWidth;
        this.resolution = Math.min(window.devicePixelRatio || 2, 3);
        this._fitScale();
    }

    set text(value) {
        super.text = value;
        this._fitScale();
    }

    get text() {
        return super.text;
    }

    _fitScale() {
        this.scale.set(1);
        if (this._maxWidth && this.width > this._maxWidth) {
            this.scale.set(this._maxWidth / this.width);
        }
    }
}
