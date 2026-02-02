import { GameStates } from "../GameStates.js";

import { PresentationAct } from "./PresentationAct.js";

export class GoToNextStateAct extends PresentationAct {
    constructor({ gameState, gameLogic, skipStep = true }) {
        super();
        this.skipStep = skipStep;
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
        if (this.gameLogic.hasFreeSpins()) {
            this.gameState.goTo(GameStates.FREE_SPIN_INTRO);
        } else {
            this.gameState.goTo(GameStates.IDLE);
        }
    }
}
