import { Layout } from "../layout/Layout.js";

export class ZoneContainer extends Layout {
    constructor({ zone, zoneName, ...props }) {
        super({ mode: "manual", size: zone[zoneName] || "auto", ...props });

        this.zoneName = zoneName;
    }

    /**
     * Override layout to position ALL children regardless of visibility.
     * ZoneContainer children (popups, panels) may be hidden and shown dynamically.
     * They must maintain correct positions based on current zone dimensions
     * so they appear in the right place when made visible.
     */
    layout() {
        if (this.children.length === 0) {
            this.calculatedWidth = 0;
            this.calculatedHeight = 0;
            return;
        }

        const containerWidth = this.size?.width || 0;
        const containerHeight = this.size?.height || 0;

        this.calculatedWidth = containerWidth;
        this.calculatedHeight = containerHeight;

        this.children.forEach(child => {
            this._positionChildManual(child, containerWidth, containerHeight);
        });

        this._applyAreaAlignment(containerWidth, containerHeight);
    }

    onScreenResize(event) {
        super.onScreenResize(event);
        this.setSize(event.zone[this.zoneName].width, event.zone[this.zoneName].height);
        this.x = event.zone[this.zoneName].left;
        this.y = event.zone[this.zoneName].top;
    }
}
