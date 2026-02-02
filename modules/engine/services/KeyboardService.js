import { Signal } from "typed-signals";

import { Service } from "./Service.js";

/**
 * Keyboard input service. MVP version only emits onSpacePress on initial keydown.
 * @extends Service
 */
export class KeyboardService extends Service {
    /**
     * Signal emitted when the Space key is pressed once (auto-repeat is ignored).
     * @type {Signal<[]>}
     */
    onSpacePress = new Signal();
    onSpaceDown = new Signal();
    onSpaceUp = new Signal();

    /**
     * Initializes the service and subscribes to keyboard events.
     * @returns {void}
     */
    init() {
        this._onKeyDownBound = this._onKeyDownBound || this.onKeyDown.bind(this);
        this._onKeyDownBound = this._onKeyDownBound || this.onKeyDown.bind(this);
        window.addEventListener("keydown", this._onKeyDownBound, { passive: true });
        window.addEventListener("keydup", this._onKeyDownBound, { passive: true });
    }

    /**
     * Disposes the service and removes listeners.
     * @returns {void}
     */
    destroy() {
        if (this._onKeyDownBound) {
            window.removeEventListener("keydown", this._onKeyDownBound);
        }
    }

    onKeyUp(event) {}

    /**
     * Handles keydown events and emits typed signal for Space key.
     * @param {KeyboardEvent} event - DOM keyboard event
     * @returns {void}
     */
    onKeyDown(event) {
        if (event.code === "Space" || event.key === " ") {
            this.onSpacePress.emit();
        }
    }
}
