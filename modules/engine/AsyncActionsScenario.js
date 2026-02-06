import { AsyncAction } from "./AsyncAction.js";
import { ActsRunner } from "./ActsRunner.js";

export class AsyncActionsScenario {
    constructor({ actions }) {
        this.actions = actions.map((act, i) => new AsyncAction(act, i));
        this.runner = new ActsRunner(this.actions);
        this.currentAnimation = null;
        this.onComplete = this.runner.onComplete;
        this.started = false;
        this.completed = false;

        this.runner.onAction.add((action) => {
            this.currentAnimation = action;
        });

        this.onComplete.add(() => {
            this.currentAnimation = null;
            this.completed = true;
        });
    }

    start() {
        if (this.started || this.completed) {
            return;
        }

        this.started = true;
        this.completed = false;

        this.runner.start();
    }

    toNext() {
        if (!this.started || this.completed) {
            return;
        }

        this.runner.toNext();

        if (this.runner.completed) {
            this.completed = true;
        }
    }

    jumpTo(action) {
        if (!this.started || this.completed) {
            return;
        }

        this.runner.jumpTo(action);
        this.completed = this.runner.completed;
    }

    skipAllIfPossible() {
        if (!this.started || this.completed) {
            return;
        }

        this.runner.skipAllIfPossible({ includeCurrent: true });
        this.completed = this.runner.completed;
    }
}
