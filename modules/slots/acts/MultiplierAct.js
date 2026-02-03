import gsap from "gsap";

import { PresentationAct } from "./PresentationAct.js";
import { services } from "../../engine/index.js";
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
        this.currencyFormatter = services.currencyFormatter;
        this._win = this.gameLogic.getFreeSpinsTotalWin() + result.win.winBeforPay;
    }

    set win(value) {
        this._win = value;
        this.hud.setWin(value);
    }

    get win() {
        return this._win;
    }

    action() {
        const { multipliers, win } = this.result;
        const { total: finalWin, beforeMultiplier: winBeforeMultiplier } = win;
        const targetPos = this.hud.getTumbleWinTargetPosition();

        let accumulatedMultiplier = 0;

        this.timeline.add(() => {
            this.hud.setTumbleWinValue(win.winBeforPay);
        });

        const tumbleWinValues = this.hud.layout.findAll("tumbleWinValue");

        this.timeline.set(tumbleWinValues, { money: winBeforeMultiplier });

        multipliers.forEach(({ row, column, multiplier }) => {
            accumulatedMultiplier += multiplier;

            this.timeline.add(this.reelsScene.getMultiplierFlyAnimation(row, column, targetPos));
            this.timeline.set(tumbleWinValues, { pixi: { text: `${this.currencyFormatter.format(winBeforeMultiplier)} x ${accumulatedMultiplier}` } }, "-=0.1");
        });

        this.timeline.to(this, {duration: 1});
        this.timeline.playSfx("multiplier_split_anim");
        this.timeline.to(tumbleWinValues, { pixi: { scaleX: 1.3, scaleY: 1.3 }, duration: 0.2, ease: "back.out(2)" });
        this.timeline.to(tumbleWinValues, { pixi: { scaleX: 1, scaleY: 1 }, delay: 0.2, duration: 0.3 });
        this.timeline.playSfx("multiplier_merge_anim");
        this.timeline.add([
            gsap.to(tumbleWinValues, { money: finalWin, duration: 0.5 }),
            gsap.to(this, { win: `+=${finalWin - winBeforeMultiplier}`, duration: 0.5 }),
        ], "-=0.2");
        this.timeline.add(this.delay(0.2));

        return this.timeline;
    }


    skip() {
        const { win: { winAfterPay } } = this.result;
        const fsTotalWin = this.gameLogic.getFreeSpinsTotalWin();

        this.hud.setWin(fsTotalWin + winAfterPay);
        this.hud.setTumbleWinValue(winAfterPay);
        this.reelsScene.goToIdle();
    }

          /**
         * @description Shows tumble win with multiplier format
         * @param {number} baseWin - Base win before multiplier
         * @param {number} currentMultiplier - Current accumulated multiplier
         */
        showTumbleWinMultiplier(baseWin, currentMultiplier) {
            this.hud.setTumbleWinText(`${this.currencyFormatter.format(baseWin)} x ${currentMultiplier}`);
        }

        /**
         * @description Shows final tumble win value
         * @param {number} finalWin - Final win after all multipliers
         */
        finalizeTumbleWin(finalWin) {
            this.hud.setTumbleWinText(finalWin);
        }
}
