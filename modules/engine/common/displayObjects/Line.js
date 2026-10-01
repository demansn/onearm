import { Graphics } from "pixi.js";

// Проверено рендером в PixiJS 8.18: alignment 0 кладёт полосу на [0, w] от оси (вниз от y),
// 0.5 даёт [-w/2, w/2] (по центру), 1 даёт [-w, 0]. Альфу из строки rgba(r,g,b,a) PixiJS переносит сам.
const ALIGNMENT_CENTER = 0.5;

/**
 * Прямая линия из Figma (узлы LINE и прямые stroke-only VECTOR).
 * Начало отрезка в (0, 0) объекта, направление по оси X, поворот задаётся `angle` объекта.
 * Обводка всегда по центру оси, сдвиг под Figma делает экспортёр.
 * @param {Object} options
 * @param {string} options.name - Имя объекта
 * @param {number} options.length - Длина отрезка, больше нуля
 * @param {Object} options.style
 * @param {string|number} options.style.stroke - Цвет (`rgba(r,g,b,a)` или число)
 * @param {number} options.style.strokeWidth - Толщина, больше нуля
 * @param {"butt"|"round"|"square"} [options.style.cap="butt"] - Форма концов
 */
export class Line extends Graphics {
    constructor(options) {
        super();

        const { name, length, style } = options;
        const s = style || {};

        if (!(typeof length === "number" && length > 0)) {
            throw new Error(`Line "${name}": length должен быть положительным числом, получено ${length}`);
        }
        if (!(typeof s.strokeWidth === "number" && s.strokeWidth > 0)) {
            throw new Error(
                `Line "${name}": style.strokeWidth должен быть положительным числом, получено ${s.strokeWidth}`,
            );
        }
        if (s.stroke === undefined || s.stroke === null || s.stroke === "") {
            throw new Error(`Line "${name}": не задан style.stroke`);
        }

        this.label = name;
        this._length = length;
        this._stroke = s.stroke;
        this._strokeWidth = s.strokeWidth;
        this._cap = s.cap || "butt";

        this.redraw();
    }

    set strokeColor(strokeColor) {
        if (this._stroke === strokeColor) {
            return;
        }

        this._stroke = strokeColor;
        this.redraw();
    }

    set strokeWidth(strokeWidth) {
        if (this._strokeWidth === strokeWidth) {
            return;
        }

        this._strokeWidth = strokeWidth;
        this.redraw();
    }

    redraw() {
        this.clear();
        this.moveTo(0, 0);
        this.lineTo(this._length, 0);
        this.stroke({
            width: this._strokeWidth,
            color: this._stroke,
            cap: this._cap,
            alignment: ALIGNMENT_CENTER,
        });
    }
}
