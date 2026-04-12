import { BaseContainer } from "../core/BaseContainer.js";

export class SpineGroup extends BaseContainer {
    constructor({ parts = [] } = {}) {
        super();
        this.sortableChildren = true;
        for (const part of parts) {
            this.addObject("SpineAnimation", part);
        }
    }

    play(loop) {
        this.children.forEach(p => p.play?.(loop));
    }

    stop() {
        this.children.forEach(p => p.stop?.());
    }

    getPart(spineName) {
        return this.children.find(p => p.label === spineName);
    }
}
