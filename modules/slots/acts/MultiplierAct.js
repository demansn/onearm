import gsap from "gsap";

import { PresentationAct } from "./PresentationAct.js";
import { getEngineContext } from "../../engine/common/core/EngineContext.js";

/**
 * @description Act for playing multiplier fly animation and win counter
 */
export class MultiplierAct extends PresentationAct {
    /**
     * @param {Object} params - Act parameters
     * @param {Object} params.result - Multiplier step result with multipliers, multiplier, winBeforeMultiplier
     * @param {Object} params.reelsScene - Reels scene reference
     * @param {Object} params.hud - HUD controller reference
     * @param {Object} params.gameLogic - Game logic reference
     */
    constructor({ result, reelsScene, hud, gameLogic }) {
        super({ skipStep: true });
        this.reelsScene = reelsScene;
        this.result = result;
        this.hud = hud;
        this.gameLogic = gameLogic;
        this.currencyFormatter = getEngineContext().services.get("currencyFormatter");
        this.anim = getEngineContext().services.get("animations");
        this._win = this.gameLogic.getFreeSpinsTotalWin() + result.win.winBeforePay;
    }

    set win(value) {
        this._win = value;
        this.hud.setWin(value);
    }

    get win() {
        return this._win;
    }

    action() {
        return this.anim.get("multiplierPresentation")(this.result, {
            hud: this.hud,
            reelsScene: this.reelsScene,
            currencyFormatter: this.currencyFormatter,
            winTarget: this,
        });
    }

    skip() {
        const { win: { winAfterPay } } = this.result;
        const fsTotalWin = this.gameLogic.getFreeSpinsTotalWin();

        this.hud.setWin(fsTotalWin + winAfterPay);
        this.hud.setTumbleWinValue(winAfterPay);
        this.reelsScene.goToIdle();
    }

    showTumbleWinMultiplier(baseWin, currentMultiplier) {
        this.hud.setTumbleWinText(`${this.currencyFormatter.format(baseWin)} x ${currentMultiplier}`);
    }

    finalizeTumbleWin(finalWin) {
        this.hud.setTumbleWinText(finalWin);
    }
}
