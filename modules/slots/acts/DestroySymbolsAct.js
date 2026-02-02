import gsap from "gsap";

import { PresentationAct } from "./PresentationAct.js";

/**
 * @description Act for destroying winning symbols with animation
 */
export class DestroySymbolsAct extends PresentationAct {
    /**
     * @param {Object} params - Act parameters
     * @param {Object} params.result - Destroy step result with positions
     * @param {Object} params.reelsScene - Reels scene reference
     */
    constructor({ result, reelsScene }) {
        super({ skipStep: true });
        this.reelsScene = reelsScene;
        this.result = result;
    }

    action() {
        const { positions } = this.result;

        this.timeline.playSfx("symbol_destroy");
        this.timeline.add(this.playDestroyAnimationByPositions(positions));
        this.timeline.add(this.delay(0.1));

        return this.timeline;
    }

    skip() {
        this.reelsScene.goToIdle();
    }

        playDestroyAnimationByPositions(positions) {
            const timeline = gsap.timeline();
            const symbols = this.reelsScene.getSymbolsByPositions(positions);
            symbols.forEach(symbol => {
                timeline.playSfx("symbol_tumble_1");
                timeline.add(symbol.playDestroyAnimation());
            });

            timeline.add(() => this.reelsScene.removeSymbolsByPositions(positions));

            return timeline;
        }

}
