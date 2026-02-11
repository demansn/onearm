/**
 * @abstract
 * Base class for all game flows with automatic resource cleanup.
 *
 * Each flow represents an async step in the game loop.
 * Subclasses implement `run()` which returns the next flow or null.
 *
 * Features:
 * - Automatic disposal of subscriptions/timers via onDispose()
 * - Guaranteed cleanup even if exception occurs (finally block)
 *
 * @example
 * class MyFlow extends BaseFlow {
 *     async run() {
 *         const unsub = someSignal.connect(() => {});
 *         this.onDispose(unsub);
 *         await someAsyncWork();
 *         return new NextFlow(this.ctx);
 *     }
 * }
 */
export class BaseFlow {
    /**
     * @param {Object} ctx - Game context with services and managers
     */
    constructor(ctx) {
        this.ctx = ctx;
        /** @type {Array<() => void>} */
        this.disposables = [];
    }

    /**
     * Register a callback to be called on flow disposal.
     * Typically used for unsubscribing from events.
     * @param {() => void} callback
     */
    onDispose(callback) {
        this.disposables.push(callback);
    }

    /**
     * Wait for a typed-signals Signal to fire once.
     * Automatically disconnects on resolve and registers cleanup via onDispose.
     * @param {import('typed-signals').Signal} signal
     * @returns {Promise<*>} Resolves with the first argument passed to the signal
     */
    waitSignal(signal) {
        return new Promise((resolve) => {
            const conn = signal.connect((value) => {
                conn.disconnect();
                resolve(value);
            });
            this.onDispose(() => conn.disconnect());
        });
    }

    /**
     * Main flow logic — must be implemented by subclasses.
     * @abstract
     * @returns {Promise<BaseFlow|null>} Next flow to execute or null to end
     */
    async run() {
        throw new Error("run() must be implemented");
    }

    /**
     * Execute flow with automatic cleanup.
     * Called by gameFlowLoop, should not be overridden.
     * @returns {Promise<BaseFlow|null>}
     */
    async execute() {
        try {
            return await this.run();
        } finally {
            this.dispose();
        }
    }

    /**
     * Dispose all registered callbacks.
     * Automatically called in finally block of execute().
     */
    dispose() {
        this.disposables.forEach(d => d());
        this.disposables = [];
    }
}

/**
 * Promise-based delay utility
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
