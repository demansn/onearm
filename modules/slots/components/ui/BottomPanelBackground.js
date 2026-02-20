import { Graphics } from "pixi.js";

import { BaseContainer } from "../../../engine/index.js";

export class BottomPanelBackground extends BaseContainer {
    constructor({
        borderColor = 0x000000,
        borderWidth = 1,
        color = 0x000000,
        alpha = 0.8,
        width = 100,
        height = { default: 155, landscape: 200, portrait: 300 },
        mode = "default",
    }) {
        super();

        this.params = {
            borderColor,
            borderWidth,
            color,
            alpha,
            width,
            height,
        };

        this.mode = mode;

        this.graphics = this.addChild(new Graphics());
        this.draw();
    }

    getHeight() {
        return this.params.height[this.mode] || this.params.height.default;
    }

    onScreenResize(event) {
        if (event.zone.fullScreen.width !== this.params.width || event.mode !== this.mode) {
            this.params.width = event.zone.fullScreen.width;
            this.mode = event.mode;
            this.draw();
        }
    }

    step({screen}) {
        if (screen.zone.fullScreen.width !== this.params.width || screen.mode !== this.mode) {
            this.params.width = screen.zone.fullScreen.width;
            this.mode = screen.mode;
            this.draw();
        }
    }

    draw() {
        this.graphics.clear();
        this.graphics
            .rect(0, 0, this.params.width, this.getHeight())
            .fill({ color: this.params.color, alpha: this.params.alpha });
        // draw line top border
        this.graphics
            .moveTo(0, 0)
            .lineTo(this.params.width, 0)
            .stroke({ width: this.params.borderWidth, color: this.params.borderColor });
    }
}
