import { Ticker, UPDATE_PRIORITY } from "pixi.js";
import "@esotericsoftware/spine-pixi-v8";
import { Assets } from "pixi.js";

// Spine-pixi-v8 registers a skeleton loader whose test() matches ALL .json files
// and loads them as binary buffers, overwriting loadJson's parsed JSON output.
// This breaks spritesheet loading (and any non-spine JSON asset).
// Fix: patch the skeleton loader's test to only match .skel files.
const spineSkeletonParser = Assets.loader.parsers.find((p) => p.name === "spineSkeletonLoader");
if (spineSkeletonParser) {
    const originalTest = spineSkeletonParser.test;
    spineSkeletonParser.test = (url) => {
        // Only let Spine load .skel files directly; .json files are handled by loadJson
        if (url.split("?")[0].endsWith(".json")) return false;
        return originalTest(url);
    };
}
import "./common/layerPolyfill.js";
import { StateMachine } from "./services/stateMachine/StateMachine.js";
import { gameFlowLoop } from "./flow/gameFlowLoop.js";
import { ServiceLocator } from "./ServiceLocator.js";
import "./common/displayObjects/addObjects.js";
import { isClass } from "./utils/Utils.js";
import { loadSkin } from "./boot/loadSkin.js";

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
        // Skin mode: window.__SKINS__ is injected by the build pipeline.
        // Non-skin games never define __SKINS__, so this block is dead code for them.
        if (typeof window !== "undefined" && Array.isArray(window.__SKINS__)) {
            const { manifest } = await loadSkin(window.__SKINS__);
            gameConfig = { ...gameConfig, resources: { ...(gameConfig.resources ?? {}), manifest } };
            window.__bootSplashHide?.();
        }

        const services = new ServiceLocator();
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
