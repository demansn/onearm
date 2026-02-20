import { BaseState } from "../engine/index.js";
import { BaseContainer } from "../engine/index.js";
// AudioManager доступен через services.audioManager

export class BaseGameState extends BaseState {
    /**
     * Dependencies
     * @type {ServiceLocator}
     */
    services = null;
    constructor(parameters) {
        super(parameters);

        this.services = parameters.services;
        this.gameLogic = parameters.services.get("gameLogic");
        this.gameConfig = parameters.services.get("gameConfig");
        this.scenes = parameters.services.get("scenes");
        this.data = parameters.services.get("data");
        this.currencyFormatter = parameters.services.get("currencyFormatter");
        this.keyboard = parameters.services.get("keyboard");

        this.root = new BaseContainer();
        this.root.parentLayer = this.services.get("layers").get("default");
        this.services.get("app").root.addChild(this.root);
        /**
         * @type {import('@slot/engine').AudioManager}
         */
        this.audio = this.services.get("audio");
    }
    /**
     *
     * @type {SuperContainer}
     */
    root = null;
    enter() {
        super.enter();
    }

    exit() {
        super.exit();

        this.root.destroy();
    }

    update(dt) {
        super.update(dt);
        const currentState = this.currentState;

        if (currentState && currentState.update) {
            currentState.update(dt);
        }
    }
}
