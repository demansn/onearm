import { Signal } from "typed-signals";

export class ActsRunner {
    constructor(actions) {
        this.actions = actions;
        this.index = 0;
        this.currentAction = null;
        this.onAction = new Signal();
        this.onComplete = new Signal();
        this.started = false;
        this.completed = false;
    }

    start() {
        if (this.started || this.completed) {
            return;
        }

        this.started = true;
        this.completed = false;
        this.toNext();
    }

    toNext() {
        if (!this.started || this.completed) {
            return;
        }

        let action = null;

        while (this.index < this.actions.length) {
            const candidate = this.actions[this.index];
            this.index += 1;

            if (candidate && candidate.isGuard()) {
                action = candidate;
                break;
            }
        }

        if (action) {
            this.currentAction = action;
            this.onAction.emit(action);

            const conn = action.onComplete.connect(() => {
                conn.disconnect();
                this.toNext();
            });
            action.apply();
        } else {
            this.currentAction = null;
            this.completed = true;
            this.onAction.emit(null);
            this.onComplete.emit();
        }
    }

    jumpTo(action) {
        if (!this.started || this.completed) {
            return;
        }

        for (let i = this.index; i < this.actions.length; i++) {
            if (this.actions[i] === action) {
                this.index = i;
                this.toNext();
                return;
            }
        }
    }

    skipAllIfPossible({ includeCurrent = true } = {}) {
        if (!this.started || this.completed) {
            return;
        }

        if (includeCurrent && this.currentAction && this.currentAction.skipDisabled) {
            return;
        }

        if (includeCurrent && this.currentAction && !this.currentAction.skipDisabled) {
            this.currentAction.skip();
            this.currentAction = null;
        }

        while (this.index < this.actions.length) {
            const action = this.actions[this.index];

            if (!action.isGuard()) {
                this.index += 1;
                continue;
            }

            if (action.skipDisabled || action.skipStep) {
                this.jumpTo(action);
                return;
            }

            action.skip();
            this.index += 1;
        }

        if (this.index >= this.actions.length && this.currentAction === null) {
            this.completed = true;
            this.onComplete.emit();
        }
    }
}
