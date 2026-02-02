import { PresentationAct } from "./PresentationAct.js";
import { CascadeAnimation } from "../animations/CascadeAnimation.js";

/**
 * @description Act for cascading symbols down and adding new symbols from top
 */
export class CascadeAct extends PresentationAct {
    /**
     * @param {Object} params - Act parameters
     * @param {Object} params.result - Cascade step result with movements and newSymbols
     * @param {Object} params.reelsScene - Reels scene reference
     * @param {Object} params.data - Game data
     */
    constructor({ result, reelsScene, data }) {
        super({ skipStep: true });
        this.reelsScene = reelsScene;
        this.data = data;
        this.result = result;
        this.cascadeAnimation = new CascadeAnimation(reelsScene);
    }

    action() {
        const { movements, newSymbols } = this.result;

        this.timeline.playSfx("cascade");
        this.timeline.add(
            this.cascadeAnimation.build(
                { movements, newSymbols },
                { sfxIndex: this.result.number || 0 }
            )
        );

        if (this.data.spinType === "turbo") {
            this.timeline.timeScale(1.2);
        }
        

        return this.timeline;
    }

    skip() {
        this.reelsScene.goToIdle();
    }
}
