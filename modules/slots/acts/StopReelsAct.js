import { PresentationAct } from "./PresentationAct.js";

export class StopReelsAct extends PresentationAct {
    /**
     * @param {Object} params
     * @param {Object} params.reelsScene - Reels scene instance
     * @param {Object} params.result - Spin result
     * @param {Object} params.data - Game data
     * @param {boolean} [params.quickStop=false] - Use quick stop animation
     */
    constructor({ reelsScene, result, data, quickStop = false }) {
        super({ skipStep: true });
        this.reelsScene = reelsScene;
        this.result = result;
        this.data = data;
        this.quickStop = quickStop;
    }

    get isTurboSpin() {
        return this.data.spinType === "turbo";
    }

    get isQuickSpin() {
        return this.data.spinType === "quick";
    }

    skip() {
        this.reelsScene.stop(this.result, true);
    }

    action() {
        if (this.quickStop) {
            this.timeline.add(this.reelsScene.quickStop(this.result, this.data.spinType));
        } else {
            this.timeline.add(this.reelsScene.stop(this.result, false, this.data.spinType));
        }

        const count = Math.min(5, this.result.matrix.getSymbolsCount("S1"));

        if (count > 0) {
            this.timeline.playSfx(`scatter_${count}`, undefined, "-=0.2");
        }

        return this.timeline;
    }
}
