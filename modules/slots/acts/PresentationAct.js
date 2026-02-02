import gsap from "gsap";

export class PresentationAct {
    constructor({} = {}) {
        this.skipStep = true;
        this._timeline = null;
    }

    get timeline() {
        if (!this._timeline) {
            this._timeline = gsap.timeline({id: `presentation-act-${this.constructor.name}`});
        }

        return this._timeline;
    }

    get guard() {
        return true;
    }

    action() {}

    skip() {}

    delay(time) {
        return gsap.delayedCall(time, () => {});
    }
}
