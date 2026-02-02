import gsap from "gsap";

import { PresentationAct } from "./PresentationAct.js";

export class PaysAct extends PresentationAct {
    /**
     * @param {Object} params
     * @param {Object} params.result - Spin result
     * @param {Object} params.reelsScene - Reels scene instance
     * @param {Object} params.hud - HUD instance
     * @param {Object} params.gameLogic - Game logic instance
     * @param {OObjectbject} params.scenes - Scenes manager
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
        this._win = 0;

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
        this.hud.setWin(this.result.win);
        this.reels.goToIdle();

        return this.reels.skipWin(this.result);
    }

    makePaysAnimation() {
        const timeline = gsap.timeline();
        timeline.add(() => {
            this.hud.showWinInfo();
        });

        const paysAnimations = [];
        this.result.pays.forEach(pay => {
            paysAnimations.push(this.makePayAnimation(pay));
        });

        timeline.add(paysAnimations);
        timeline.add(() => this.hud.clearPayInfo());

        return timeline;
    }

    getWinCounterTimeline(win, duration) {
        const timeline = gsap.timeline();

        if (this.isTurboSpin) {
            timeline.add(() => {
                this._balance += win;
                this._win += win;
                this.hud.setBalance(this._balance);
                this.hud.setWin(this._win);
            });
            timeline.playSfx("counter_end");
            return timeline;
        }

        timeline.playSfx("counter_loop", { loop: true });
        timeline.add([
            gsap.to(this, { balance: `+=${win}`, duration }),
            gsap.to(this, { win: `+=${win}`, duration }),
        ]);
        timeline.stopSfx("counter_loop");
        timeline.playSfx("counter_end");

        return timeline;
    }

    makePayAnimation(pay) {
        const { positions, win } = pay;
        const timeline = gsap.timeline();
        const duration = this.isTurboSpin ? 0 : 1;
        const sounds = ["low_payout_1","low_payout_2","low_payout_3","low_payout_4"];
        const sound = sounds[Math.floor(Math.random() * sounds.length)];
        timeline.playSfx(sound);

        timeline.add([
            this.getWinAnimationByPositions(positions),
            this.getWinCounterTimeline(win, duration),
            this.hud.showPayInfo(pay),
        ]);
        timeline.add(() => this.reels.removeSymbolsByPositions(positions));
        timeline.add(this.reels.playPayAnimation({ positions, win }),  "+0.75");

        return timeline;
    }

    /**
     * @param {Array<{row: number, column: number}>} positions - Symbol positions     * @returns {gsap.core.Timeline}
     */
    getWinAnimationByPositions(positions) {
        const getSymbolWinAnimation = ({ row, column }) => {
            const symbol = this.reels.getSymbolByPosition({ row, column });
            return symbol.playWinAnimation(this.isTurboSpin);
        };

        return positions.map(getSymbolWinAnimation);
    }
}
