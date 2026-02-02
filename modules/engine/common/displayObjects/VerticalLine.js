import { Graphics } from "pixi.js";

/**
 * Class representing a vertical line.
 * @extends Graphics
 */
export class VerticalLine extends Graphics {
    /**
     * Creates an instance of VerticalLine.
     * @param {Object} parameters - The parameters for the vertical line.
     * @param {number} parameters.height - The height of the vertical line.
     * @param {number} [parameters.thickness=2] - The thickness of the vertical line.
     * @param {number} [parameters.color=0xffffff] - The color of the vertical line.
     * @param {number} [parameters.alpha=0.5] - The alpha transparency of the vertical line.
     */
    constructor(parameters) {
        super();
        this.parameters = parameters;

        this.#drawLine();
    }
    /**
     * Draws the vertical line based on the provided parameters.
     * @private
     */
    #drawLine() {
        const { height, thickness = 2, color = 0xffffff, alpha = 0.5 } = this.parameters;
        this.clear();
        this.lineStyle(thickness, 0xffffff, alpha);
        this.beginFill(color, alpha);
        this.drawRect(0, 0, thickness, height);
        this.endFill();
    }
}
