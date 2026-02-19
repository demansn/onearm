import { Ticker, UPDATE_PRIORITY } from "pixi.js";
import "@esotericsoftware/spine-pixi-v8";
import "./common/layerPolyfill.js";
import { StateMachine } from "./services/stateMachine/StateMachine.js";
import { gameFlowLoop } from "./flow/gameFlowLoop.js";
import { services } from "./ServiceLocator.js";
import "./common/displayObjects/addObjects.js";
import { isClass } from "./utils/Utils.js";

export class Game {
    static start(gameConfig) {
        if (this._game) {
            return;
        }

        this._game = new Game(gameConfig);
    }
    _app = null;
    _ticker = null;
    _services = [];
    constructor(gameConfig) {
        this.init(gameConfig);
    }

    async init(gameConfig) {
        for (const [name,{ Service }] of Object.entries(gameConfig.services)) {
            let service = null;
            const options = gameConfig[name] || {};
            const parameters = {
                gameConfig,
                services,
                options,
                name,
            };
            if (isClass(Service)) {
                service = new Service(parameters);

                if (service.init) {
                    await service.init(parameters);
                }
            } else if (typeof Service === "function") {
                // eslint-disable-next-line new-cap
                service = Service(parameters);
            } else {
                service = Service;
            }
            services.set(name, service);
            this._services.push(service);
        }

        this._app = services.get("app");
        this._resizeSystem = services.get("resizeSystem");

        this._ticker = new Ticker();
        this._ticker.add(this.onTick, this, UPDATE_PRIORITY.LOW);
        this._ticker.start();

        if (gameConfig.flow) {
            this.fsm = null;
            const ctx = services.getAll();
            gameFlowLoop(ctx, gameConfig.flow);
        } else {
            /**
             * @type {StateMachine}
             */
            this.fsm = new StateMachine({
                services: services,
                states: gameConfig.states,
            });
            this.fsm.goTo(gameConfig.initState);
        }
    }

    onTick() {
        let elapsedTimeInSeconds = this._ticker.deltaMS / 1000;
        if (elapsedTimeInSeconds > 1) {
            elapsedTimeInSeconds = 1;
        }

        this._services.forEach(service => {
            if (service && service.step) {
                service.step({dt: elapsedTimeInSeconds});
            }
        });
        const screenState = this._resizeSystem.getContext();
        const event = {dt: elapsedTimeInSeconds, screen: screenState };

        if (this.fsm) {
            const currentState = this.fsm.getCurrentState();
            if (currentState && currentState.update) {
                currentState.update(event);
            }
        }

        this._app.root.children.forEach((child) => child.step && child.step(event));
        this._app.render();
    }
}
