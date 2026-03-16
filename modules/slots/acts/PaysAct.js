import gsap from "gsap";

import { PresentationAct } from "./PresentationAct.js";
import { getEngineContext } from "../../engine/common/core/EngineContext.js";

export class PaysAct extends PresentationAct {
    /**
     * @param {Object} params
     * @param {Object} params.result - Spin result
     * @param {Object} params.reelsScene - Reels scene instance
     * @param {Object} params.hud - HUD instance
     * @param {Object} params.gameLogic - Game logic instance
     * @param {Object} params.scenes - Scenes manager
     * @param {boolean} params.data - Game data
     */
    constructor({ result, reelsScene, hud, gameLogic, scenes, data }) {
        super({ skipStep: true });
        this.reels = reelsScene;
        this.result = result;
        this.gameLogic = gameLogic;
        this.hud = hud;
        this.scenes = scenes;
        this.data = data;
        this._balance = gameLogic.balance - result.win;
        this._win = result.winBeforePay;
        this.anim = getEngineContext().services.get("animations");

        this.skipStep = true;
    }

    get isTurboSpin() {
        return this.data.spinType === "turbo";
    }

    get isQuickSpin() {
        return this.data.spinType === "quick";
    }

    set win(value) {
        this._win = value;
        this.hud.setWin(value);
    }

    get win() {
        return this._win;
    }

    set balance(value) {
        this._balance = value;
        this.hud.setBalance(value);
    }

    get balance() {
        return this._balance;
    }

    action() {
        return this.makePaysAnimation();
    }

    skip() {
        this.hud.setBalance(this.gameLogic.balance);
        this.hud.setWin(this.result.winAfterPay);
        this.reels.goToIdle();

        return this.reels.skipWin(this.result);
    }

    makePaysAnimation() {
        const timeline = gsap.timeline();
        timeline.add(() => this.hud.showWinInfo());

        this.result.pays.forEach(pay => {
            timeline.add(this.anim.get("payPresentation")(pay, {
                reels: this.reels,
                hud: this.hud,
                counterTarget: this,
                isTurbo: this.isTurboSpin,
            }));
        });

        timeline.add(() => this.hud.clearPayInfo());
        return timeline;
    }
}
