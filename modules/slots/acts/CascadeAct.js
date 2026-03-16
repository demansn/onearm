import { PresentationAct } from "./PresentationAct.js";
import { getEngineContext } from "../../engine/common/core/EngineContext.js";

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
        this.anim = getEngineContext().services.get("animations");
    }

    action() {
        const { movements, newSymbols } = this.result;

        return this.anim.get("cascade")(this.reelsScene, {
            movements,
            newSymbols,
            sfxIndex: this.result.number || 0,
            turbo: this.data.spinType === "turbo",
        });
    }

    skip() {
        this.reelsScene.goToIdle();
    }
}
