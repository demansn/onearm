import gsap from "gsap";

import { PresentationAct } from "./PresentationAct.js";

export class FreeSpinsTriggerAct extends PresentationAct {
    constructor({ result, reelsScene, hud, gameLogic }) {
        super({ skipStep: true, disableSkip: true });
        this.gameLogic = gameLogic;
        this.hud = hud;
        this.reels = reelsScene;
        this.result = result;
        this._win = 0;
        this._balance = this.gameLogic.balance;
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

    setBalance(value) {
        this.hud.setBalance(value);
    }

    action() {
        const { positions, win } = this.result;
        const symbols = this.reels.getSymbolsByPositions(positions);

        this.timeline.playSfx("fs_trigger");

        this.timeline.add(() => this.hud.showWinInfo());

        this.timeline.playSfx("counter_loop", { loop: true })
        this.timeline.add([
            () => this.hud.showPayInfo(this.result),
            ...symbols.map(s => s.playTriggerAnimation()),
            gsap.to(this, { win: `+=${win}`, duration: 1 })
        ]);
        this.timeline.stopSfx("counter_loop");


        return this.timeline;
    }

    skip() {
        this.reels.goToIdle();
    }
}
