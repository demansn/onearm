import { Service } from "../engine/index.js";
import { Signal } from "typed-signals";

export class AutoplayController extends Service {
    init() {
        super.init();
        this.gameCount = 0;
        this.win = 0;
        this.loss = 0;
        this._isActive = false;

        this.onComplete = new Signal();
    }

    get isTurboSpin() {
        return this.options && this.options.turboSpin;
    }

    get isQuickSpin() {
        return this.options && this.options.quickSpin;
    }

    get isSkipScreen() {
        return this.options && this.options.skipScreen;
    }

    start({
        gamesLimit,
        winLimit = 0,
        lossLimit = 0,
        turboSpin = false,
        skipScreen,
        quickSpin = false,
    }) {
        this.options = {
            quickSpin,
            gamesLimit,
            winLimit,
            lossLimit,
            turboSpin,
            skipScreen,
        };

        this.gameCount = 0;
        this.win = 0;
        this.loss = 0;
        this._isActive = true;
    }

    next({ win, loss, gameCount = 1 }) {
        this.gameCount += gameCount;
        this.win += win;
        this.loss += loss;

        this.checkLimits();

        if (!this._isActive) {
            this.onComplete.emit();
        }

        return this._isActive;
    }

    getGamesLeft() {
        if (!this._isActive) {
            return 0;
        }
        if (this.options.gamesLimit) {
            return this.options.gamesLimit - this.gameCount;
        }
        return 0;
    }

    progress() {
        if (this.options.gamesLimit) {
            return this.gameCount / this.options.gamesLimit;
        }
        return 0;
    }

    stop() {
        if (!this._isActive) {
            return;
        }
        this._isActive = false;
        this.gameCount = 0;
        this.win = 0;
        this.loss = 0;

        this.onComplete.emit();
    }

    checkLimits() {
        // Check if the autoplay limits have been reached
        if (this.options.gamesLimit && this.gameCount >= this.options.gamesLimit) {
            this._isActive = false;
        }
        if (this.options.winLimit && this.win >= this.options.winLimit) {
            this._isActive = false;
        }
        if (this.options.lossLimit && this.loss >= this.options.lossLimit) {
            this._isActive = false;
        }
    }

    isActive() {
        return this._isActive;
    }
}
