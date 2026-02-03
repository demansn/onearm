import gsap from "gsap";

import { PresentationAct } from "./PresentationAct.js";

export class FreeSpinsPaysAct extends PresentationAct {
    /**
     * @param {Object} params
     * @param {Object} params.result - Spin result
     * @param {Object} params.reelsScene - Reels scene instance
     * @param {Object} params.hud - HUD instance
     * @param {Object} params.gameLogic - Game logic instance
     * @param {Object} params.scenes - Scenes manager
     * @param {boolean} [params.turboSpin=false] - Turbo spin mode
     */
    constructor({ result, reelsScene, hud, gameLogic, scenes, turboSpin = false }) {
        super({ skipStep: true });
        this.reels = reelsScene;
        this.result = result;
        this.gameLogic = gameLogic;
        this.hud = hud;
        this.scenes = scenes;
        this.turboSpin = turboSpin;

        if (this.result.bigWinLevel !== null) {
            this.disableSkip = true;
        }

        this._totalWin = gameLogic.getFreeSpinsTotalWin() + this.result.winBeforPay;
        this._win = this.result.winBeforPay;
    }

    _totalWin = 0;

    set totalWin(value) {
        this._totalWin = value;
        this.hud.setWin(value);
    }

    get totalWin() {
        return this._totalWin;
    }

    _win = 0;

    set win(value) {
        this._win = value;
        this.hud.setTumbleWinValue(value);
    }

    get win() {
        return this._win;
    }

    action() {
        return this.makePaysAnimation();
    }

    skip() {
        this.hud.setWin(this.gameLogic.getFreeSpinsTotalWin() + this.result.winAfterPay);
        this.hud.setTumbleWinValue(this.result.winAfterPay);
        this.reels.skipWin(this.result);
        this.scenes.remove("WinsPopupScene");
    }

    makePaysAnimation() {
        const timeline = gsap.timeline();

        timeline.set(this, {
            win: this._win,
            totalWin: this._totalWin,
        });
        timeline.add(() => this.hud.showTumbleWin(this.result.winBeforPay));

        this.result.pays.forEach(pay => {
            timeline.add(this.makePayAnimation(pay, pay.win));
        });


        return timeline;
    }

    makePayAnimation(pay, nextWin) {
        const { positions, win, bigWinLevel } = pay;
        const timeline = gsap.timeline();
        const duration = this.turboSpin ? 0 : 1;
        const sounds = ["low_payout_1","low_payout_2","low_payout_3","low_payout_4"];
        const sound = sounds[Math.floor(Math.random() * sounds.length)];
        timeline.playSfx(sound);

        if (bigWinLevel !== null) {
            timeline.add(this.reels.getWinAnimationByPositions(positions, this.turboSpin));
        }

        timeline.add([
            this.reels.getWinAnimationByPositions(positions, this.turboSpin),
            this.getWinCounterTimeline(nextWin, duration),
            this.hud.showPayInfo(pay),
        ]);

        timeline.add(() => this.reels.removeSymbolsByPositions(positions));
        timeline.add(this.reels.playPayAnimation({ positions, win }),  "+0.75");

        return timeline;
    }

    getWinCounterTimeline(win, duration) {
        const timeline = gsap.timeline();

        if (this.turboSpin) {
            timeline.set({
                win: this.win + win,
                totalWin: this.totalWin + win,
            });
            timeline.playSfx("free_spins_pays_counter_end");
            return timeline;
        }

        timeline.playSfx("free_spins_pays_counter_loop", { loop: true });
        timeline.add([
            gsap.to(this,{ win: `+=${win}`, duration }),
            gsap.to(this,{ totalWin: `+=${win}`, duration })
        ]);
        timeline.stopSfx("free_spins_pays_counter_loop");
        timeline.playSfx("free_spins_pays_counter_end");

        return timeline;
    }
}
