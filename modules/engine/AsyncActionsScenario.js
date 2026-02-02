import signals from "signals";

import { AsyncAction } from "./AsyncAction.js";

export class AsyncActionsScenario {
    constructor({ actions }) {
        this.actions = actions.map((act, i) => new AsyncAction(act, i));
        this.currentAnimation = null;
        this.onComplete = new signals.Signal();
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

        do {
            action = this.actions.shift();
        } while (action && !action.isGuard());

        if (action) {
            this.currentAnimation = action;

            action.onComplete.addOnce(this.toNext.bind(this));
            action.apply();
        } else {
            this.currentAnimation = null;
            this.completed = true;
            this.onComplete.dispatch();
        }
    }

    jumpTo(action) {
        if (!this.started || this.completed) {
            return;
        }

        for (let i = 0; i < this.actions.length; i++) {
            if (this.actions[i] === action) {
                this.actions.splice(0, i);
                this.toNext();
                return;
            }
        }
    }

    skipAllIfPossible() {
        if (!this.started || this.completed) {
            return;
        }

        if (this.currentAnimation && this.currentAnimation.skipDisabled) {
            return;
        }

        if (this.currentAnimation && !this.currentAnimation.skipDisabled) {
            this.currentAnimation.skip();
            this.currentAnimation = null;
        }

        while (this.actions.length) {
            const action = this.actions.shift();

            if (!action.isGuard()) {
                continue;
            }

            if (action.skipDisabled || action.skipStep) {
                this.actions.unshift(action);
                this.jumpTo(action);
                return;
            }

            action.skip();
        }

        if (this.actions.length === 0 && this.currentAnimation === null) {
            this.actions = [];
            this.completed = true;
            this.onComplete.dispatch();
        }
    }
}
