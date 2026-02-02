import { Graphics, Matrix, Texture, RenderTexture, Renderer } from "pixi.js";

/**
 * Rectangle graphics class with gradient support
 * @param {Object} options - Configuration options
 * @param {string} options.name - Name of the rectangle
 * @param {number} options.width - Width of the rectangle
 * @param {number} options.height - Height of the rectangle
 * @param {number|Array<number|string>} options.color - Fill color (single color or array for gradient)
 * @param {Array<number>} [options.colorStops] - Color stop positions for gradient (0-1)
 * @param {'linear'|'radial'|'angular'} [options.gradientType] - Type of gradient
 * @param {number} [options.gradientAngle=0] - Angle for linear gradient in degrees (0 = horizontal left to right)
 * @param {Object} [options.gradientCenter] - Center point for radial/angular gradients {x: 0.5, y: 0.5} (0-1 relative to size)
 * @param {number} [options.gradientRadius] - Radius for radial gradient (relative to max dimension)
 * @param {number} [options.alpha=1] - Alpha transparency
 * @param {number} [options.stroke=0x000000] - Stroke color
 * @param {number} [options.strokeWidth=0] - Stroke width
 * @param {number} [options.radius=0] - Border radius for rounded rectangle
 */
export class Rectangle extends Graphics {
    constructor(options) {
        super();

        this.name = options.name;
        this._width = options.width;
        this._height = options.height;
        this._color = options.color || 0x000000;
        this._colorStops = options.colorStops || null;
        this._gradientType = options.gradientType || null;
        this._gradientAngle = options.gradientAngle || 0;
        this._gradientCenter = options.gradientCenter || { x: 0.5, y: 0.5 };
        this._gradientRadius = options.gradientRadius || 1;
        this._alpha = options.alpha || 1;
        this._stroke = options.stroke || 0x000000;
        this._strokeWidth = Math.floor(options.strokeWidth) || 0;
        this._radius = options.radius || 0;

        this.redraw();
    }

    get width() {
        return this._width;
    }

    get height() {
        return this._height;
    }

    set width(width) {
        if (this._width === width) {
            return;
        }

        this._width = width;
        this.redraw();
    }

    set height(height) {
        if (this._height === height) {
            return;
        }

        this._height = height;
        this.redraw();
    }

    set color(color) {
        if (this._color === color) {
            return;
        }

        this._color = color;
        this.redraw();
    }

    set colorStops(colorStops) {
        if (this._colorStops === colorStops) {
            return;
        }

        this._colorStops = colorStops;
        this.redraw();
    }

    set gradientType(gradientType) {
        if (this._gradientType === gradientType) {
            return;
        }

        this._gradientType = gradientType;
        this.redraw();
    }

    set stroke(stroke) {
        if (this._stroke === stroke) {
            return;
        }

        this._stroke = stroke;
        this.redraw();
    }

    set strokeWidth(strokeWidth) {
        if (this._strokeWidth === strokeWidth) {
            return;
        }

        this._strokeWidth = strokeWidth;
        this.redraw();
    }

    set radius(radius) {
        if (this._radius === radius) {
            return;
        }

        this._radius = radius;
        this.redraw();
    }

    get radius() {
        return this._radius;
    }

    set gradientAngle(angle) {
        if (this._gradientAngle === angle) {
            return;
        }

        this._gradientAngle = angle;
        this.redraw();
    }

    get gradientAngle() {
        return this._gradientAngle;
    }

    set gradientCenter(center) {
        if (this._gradientCenter === center) {
            return;
        }

        this._gradientCenter = center;
        this.redraw();
    }

    get gradientCenter() {
        return this._gradientCenter;
    }

    set gradientRadius(radius) {
        if (this._gradientRadius === radius) {
            return;
        }

        this._gradientRadius = radius;
        this.redraw();
    }

    get gradientRadius() {
        return this._gradientRadius;
    }

    /**
     * Redraws the rectangle with current settings
     */
    redraw() {
        this.clear();

        if (this._strokeWidth > 0) {
            this.lineStyle(this._strokeWidth, this._stroke, 1);
        }

        // Check if we have gradient
        if (Array.isArray(this._color) && this._colorStops && this._gradientType) {
            this._applyGradientFill();
        } else {
            // Regular solid fill
            const fillColor = Array.isArray(this._color) ? this._color[0] : this._color;
            this.beginFill(fillColor, this._alpha);
        }

        if (this._radius > 0) {
            this.drawRoundedRect(0, 0, this._width, this._height, this._radius);
        } else {
            this.drawRect(0, 0, this._width, this._height);
        }
        this.endFill();
    }

    /**
     * Apply gradient fill based on gradient type
     *
     * Examples:
     * - Linear: gradientAngle controls direction (0° = left to right, 90° = top to bottom)
     * - Radial: gradientCenter controls position, gradientRadius controls size
     * - Angular: gradientCenter controls center point
     */
    _applyGradientFill() {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = this._width;
        canvas.height = this._height;

        let gradient;

        if (this._gradientType === "angular") {
            this._createConicGradient(ctx);
        } else {
            switch (this._gradientType) {
                case "linear":
                    gradient = this._createLinearGradient(ctx);
                    break;
                case "radial":
                    gradient = this._createRadialGradient(ctx);
                    break;
                default:
                    gradient = this._createLinearGradient(ctx);
            }

            for (let i = 0; i < this._color.length; i++) {
                const color = this._color[i];
                const stop = this._colorStops[i] || i / (this._color.length - 1);

                const colorString =
                    typeof color === "string" ? color : `#${color.toString(16).padStart(6, "0")}`;
                gradient.addColorStop(stop, colorString);
            }

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, this._width, this._height);
        }

        const texture = Texture.from(canvas);
        this.beginTextureFill({ texture, alpha: this._alpha });
    }

    /**
     * Create linear gradient with angle support
     */
    _createLinearGradient(ctx) {
        const angle = (this._gradientAngle * Math.PI) / 180;
        const diagonal = Math.sqrt(this._width * this._width + this._height * this._height);

        const x1 = this._width / 2 - (Math.cos(angle) * diagonal) / 2;
        const y1 = this._height / 2 - (Math.sin(angle) * diagonal) / 2;
        const x2 = this._width / 2 + (Math.cos(angle) * diagonal) / 2;
        const y2 = this._height / 2 + (Math.sin(angle) * diagonal) / 2;

        return ctx.createLinearGradient(x1, y1, x2, y2);
    }

    /**
     * Create radial gradient with center and radius control
     */
    _createRadialGradient(ctx) {
        const centerX = this._width * this._gradientCenter.x;
        const centerY = this._height * this._gradientCenter.y;
        const maxDimension = Math.max(this._width, this._height);
        const radius = maxDimension * this._gradientRadius;

        return ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    }

    /**
     * Create a conic gradient using ImageData
     */
    _createConicGradient(ctx) {
        const centerX = this._width * this._gradientCenter.x;
        const centerY = this._height * this._gradientCenter.y;
        const imageData = ctx.createImageData(this._width, this._height);
        const data = imageData.data;

        for (let y = 0; y < this._height; y++) {
            for (let x = 0; x < this._width; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                let angle = Math.atan2(dy, dx);
                angle = (angle + Math.PI) / (2 * Math.PI);

                const colorIndex = Math.floor(angle * (this._color.length - 1));
                const nextColorIndex = Math.min(colorIndex + 1, this._color.length - 1);
                const factor = angle * (this._color.length - 1) - colorIndex;

                const rgba1 = this._parseRgba(this._color[colorIndex]);
                const rgba2 = this._parseRgba(this._color[nextColorIndex]);

                const r = Math.round(rgba1.r + (rgba2.r - rgba1.r) * factor);
                const g = Math.round(rgba1.g + (rgba2.g - rgba1.g) * factor);
                const b = Math.round(rgba1.b + (rgba2.b - rgba1.b) * factor);
                const a = Math.round((rgba1.a + (rgba2.a - rgba1.a) * factor) * 255);

                const index = (y * this._width + x) * 4;
                data[index] = r;
                data[index + 1] = g;
                data[index + 2] = b;
                data[index + 3] = a;
            }
        }

        ctx.putImageData(imageData, 0, 0);
    }

    /**
     * Parse color string or hex to RGBA object
     */
    _parseRgba(color) {
        if (typeof color === "string" && color.startsWith("rgba")) {
            const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
            if (match) {
                return {
                    r: parseInt(match[1]),
                    g: parseInt(match[2]),
                    b: parseInt(match[3]),
                    a: match[4] !== undefined ? parseFloat(match[4]) : 1,
                };
            }
        }

        const rgb = this._hexToRgb(color);
        return { ...rgb, a: 1 };
    }

    /**
     * Convert hex color to RGB
     */
    _hexToRgb(hex) {
        const color = typeof hex === "string" ? parseInt(hex.replace("#", ""), 16) : hex;
        return {
            r: (color >> 16) & 255,
            g: (color >> 8) & 255,
            b: color & 255,
        };
    }
}
