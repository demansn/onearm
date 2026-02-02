import { Signal } from "typed-signals";

/**
 * @class LayoutController
 * @description Base controller that "brings layout to life" - Unity/Godot pattern.
 * Provides common functionality for controllers that work with layout elements.
 * @abstract
 */
export class LayoutController {
    /**
     * @param {Object} layout - Layout container from ScreenLayout
     * @param {Object} [options={}] - Controller options
     */
    constructor(layout, options = {}) {
        if (!layout) {
            console.warn(`${this.constructor.name}: layout is null/undefined`);
        }

        this.layout = layout;
        this.options = options;
        this._enabled = true;
        this._destroyed = false;
        this._signalConnections = [];

        this.init();
    }

    /**
     * @description Called after constructor, override to setup controller
     * @protected
     */
    init() {}

    /**
     * @description Get child element by name using get() method
     * @param {string} name
     * @returns {Object|null}
     */
    get(name) {
        return this.layout?.get?.(name) ?? null;
    }

    /**
     * @description Find child element by name recursively
     * @param {string} name
     * @returns {Object|null}
     */
    find(name) {
        return this.layout?.find?.(name) ?? null;
    }

    /**
     * @description Find all children matching name recursively
     * @param {string} name
     * @returns {Object[]}
     */
    findAll(name) {
        return this.layout?.findAll?.(name) ?? [];
    }

    /**
     * @description Iterate over all matching elements
     * @param {string|string[]} name - Element name or array of names
     * @param {function} callback
     */
    forAll(name, callback) {
        if (!this.layout?.forAll) return;

        if (Array.isArray(name)) {
            name.forEach(n => this.layout.forAll(n, callback));
        } else {
            this.layout.forAll(name, callback);
        }
    }

    /**
     * @description Connect button press to signal
     * @param {string} buttonName
     * @param {Signal} signal
     * @protected
     */
    connectButton(buttonName, signal) {
        this.forAll(buttonName, (btn) => {
            if (btn?.onPress) {
                const connection = btn.onPress.connect((v) => signal.emit(v));
                this._signalConnections.push(connection);
            }
        });
    }

    /**
     * @description Connect button change to signal
     * @param {string} buttonName
     * @param {Signal} signal
     * @protected
     */
    connectChange(buttonName, signal) {
        this.forAll(buttonName, (btn) => {
            if (btn?.onChange) {
                const connection = btn.onChange.connect((v) => signal.emit(v));
                this._signalConnections.push(connection);
            }
        });
    }

    /**
     * @description Connect to a signal and track the connection for cleanup
     * @param {Signal} signal
     * @param {function} handler
     * @protected
     */
    connectSignal(signal, handler) {
        const connection = signal.connect(handler);
        this._signalConnections.push(connection);
        return connection;
    }

    /**
     * @description Set visibility for elements by name
     * @param {string|string[]} name
     * @param {boolean} visible
     */
    setVisible(name, visible) {
        this.forAll(name, (obj) => {
            obj.visible = visible;
        });
    }

    /**
     * @description Set enabled state for elements by name
     * @param {string|string[]} name
     * @param {boolean} enabled
     */
    setEnabled(name, enabled) {
        this.forAll(name, (obj) => {
            obj.enabled = enabled;
        });
    }

    /**
     * @description Enable/disable controller
     * @param {boolean} value
     */
    set enabled(value) {
        if (this._enabled === value) return;
        this._enabled = value;
        this.onEnabledChange(value);
    }

    get enabled() {
        return this._enabled;
    }

    /**
     * @description Called when enabled state changes
     * @param {boolean} value
     * @protected
     */
    onEnabledChange(value) {}

    /**
     * @description Cleanup controller
     */
    destroy() {
        if (this._destroyed) return;
        this._destroyed = true;

        this._signalConnections.forEach(connection => {
            if (connection?.disconnect) {
                connection.disconnect();
            }
        });
        this._signalConnections = [];

        this.onDestroy();
        this.layout = null;
    }

    /**
     * @description Override for cleanup logic
     * @protected
     */
    onDestroy() {}
}

