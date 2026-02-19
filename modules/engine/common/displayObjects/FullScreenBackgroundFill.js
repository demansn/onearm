import { Graphics } from "pixi.js";

import { SuperContainer } from "./SuperContainer.js";

export class FullScreenBackgroundFill extends SuperContainer {
    constructor({ fullScreenZone, color = 0x000000, alpha } = {}) {
        super({ name: "FullScreenBackgroundFill" });
        this.fill = this.addChild(new Graphics());
        this.color = color;
        this.alpha = alpha || 1;
        this.fill
            .rect(fullScreenZone.left, fullScreenZone.top, fullScreenZone.width, fullScreenZone.height)
            .fill({ color: this.color, alpha: this.alpha });
    }

    onScreenResize(event) {
        this.draw(event.zone.fullScreen);
    }

    draw(zone) {
        this.fill.clear();
        this.fill.rect(zone.left, zone.top, zone.width, zone.height).fill({ color: this.color, alpha: this.alpha });
    }
}
