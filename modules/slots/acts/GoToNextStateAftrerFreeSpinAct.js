import { GameStates } from "../GameStates.js";

import { PresentationAct } from "./PresentationAct.js";

export class GoToNextStateAftrerFreeSpinAct extends PresentationAct {
    constructor({ gameState, gameLogic }) {
        super();
        this.skipStep = true;
        this.gameState = gameState;
        this.gameLogic = gameLogic;
    }

    action() {
        this.timeline.add(this.delay(0.25)).add(() => this.goToNextState());

        return this.timeline;
    }

    skip() {
        this.goToNextState();
    }

    goToNextState() {
        if (this.gameLogic.freeSpinsDone()) {
            this.gameState.goTo(GameStates.FREE_SPIN_OUTRO);
        } else {
            // if (this.data.freeSpinAutoSpin) {
            //     this.gameState.goTo(GameStates.FREE_SPIN_SPINNING);
            // } else {
            //     this.gameState.goTo(GameStates.FREE_SPIN_IDLE);
            // }
            this.gameState.goTo(GameStates.FREE_SPIN_SPINNING);
        }
    }
}
