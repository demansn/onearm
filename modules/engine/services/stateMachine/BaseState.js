import { SignalConnections } from "typed-signals";

import { StateMachine } from "./StateMachine.js";

export class BaseState {
    #state = null;

    constructor({ owner, name, states, scenes, services, options, ...rest }) {
        this.owner = owner;
        this.name = name || this.constructor.name;
        this.#state = states
            ? new StateMachine({ owner: this, states, services, ...rest })
            : null;

        this.options = options || {};
        this.signals = new SignalConnections();
        this.components = [];
    }

    addSignalHandler(signal, handler) {
        this.signals.add(signal.connect(handler.bind(this)));
    }

    getOption(name) {
        return this.options[name];
    }

    enter() {}

    exit() {
        this.signals.disconnectAll();
    }

    update(td) {}

    goTo(name, parameters) {
        if (!this.#state) {
            throw new Error("State machine is not defined");
        }

        const currentState = this.#state.getCurrentState();

        this.#state.goTo(name, parameters);
    }

    isCurrentState(name) {
        return this.#state && this.#state.currentState === name;
    }

    get currentState() {
        if (this.#state) {
            return this.#state.getCurrentState();
        }
    }
}
