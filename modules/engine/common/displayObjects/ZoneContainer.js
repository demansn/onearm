import { FlexContainer } from "./FlexContainer.js";

export class ZoneContainer extends FlexContainer {
    constructor({ zone, zoneName, ...props }) {
        super({ size: zone[zoneName] || "auto", ...props });

        this.zoneName = zoneName;
    }

    onScreenResize(event) {
        super.onScreenResize(event);
        this.setSize(event.zone[this.zoneName].width, event.zone[this.zoneName].height);
        this.x = event.zone[this.zoneName].left;
        this.y = event.zone[this.zoneName].top;
    }
}
