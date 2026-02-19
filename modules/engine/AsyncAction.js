import { Signal } from "typed-signals";
import gsap from "gsap";

export class AsyncAction {
    constructor(act, id) {
        this.act = act;

        this.actionCallback = (...args) => act.action(args);
        this.guard = act.guard;
        this.skipCallback = (...args) => act.skip(args);
        this.skipDisabled = act.skipDisabled;
        this.skipStep = act.skipStep;

        this.onComplete = new Signal();

        this.completActionPromise = null;

        this.isSkipped = false;
        this.isStarted = false;
        this.isCompleted = false;
        this.id = name || id;
    }

    apply() {
        if (this.isStarted) {
            return;
        }

        this.isStarted = true;

        const rusult = this.actionCallback();

        if (rusult instanceof Promise) {
            this.completActionPromise = rusult;
        } else if (
            rusult instanceof gsap.core.Timeline ||
            rusult instanceof gsap.core.Tween ||
            rusult instanceof gsap.core.Animation
        ) {
            this.completActionPromise = rusult.eventCallback("onComplete", () => {
                this.complete();
            });
        } else {
            this.completActionPromise = new Promise(resolve => {
                resolve();
            });
        }

        this.completActionPromise.then(() => {
            if (!this.isSkipped) {
                this.complete();
            }
        });
    }

    kill() {
        this.onComplete = new Signal();

        const result = this.completActionPromise;

        if (
            result instanceof gsap.core.Timeline ||
            result instanceof gsap.core.Tween ||
            result instanceof gsap.core.Animation
        ) {
            if (result.stopAllSfx) {
                result.stopAllSfx();
            }
            result.kill();
        }
    }

    skip() {
        if (this.isSkipped || this.skipDisabled) {
            return;
        }

        this.isSkipped = true;
        this.isCompleted = true;
        this.kill();
        this.skipCallback();
    }

    isGuard() {
        return typeof this.guard === "function" ? this.guard() : this.guard;
    }

    complete() {
        if (this.isCompleted) {
            return;
        }

        this.isCompleted = true;
        this.onComplete.emit();
    }
}
