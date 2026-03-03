/**
 * Creates a lightweight scope for automatic resource cleanup in async flows.
 *
 * Scope collects cleanup callbacks and executes them in reverse order (LIFO)
 * when disposed — guaranteeing that subscriptions, timers, and DOM artifacts
 * are released even if the flow throws.
 *
 * ## Usage patterns
 *
 * ### Top-level flow (boot chain)
 *
 * Managed by `gameFlowLoop`. Return the next flow function to hand control
 * over; the loop disposes the current scope before starting the next flow:
 *
 * ```js
 * async function preloader(scope, ctx) {
 *     const scene = ctx.scenes.add("PreloaderScene");
 *     scope.defer(() => ctx.scenes.remove("PreloaderScene"));
 *
 *     await ctx.resources.load("main");
 *     return gameIntro;           // scope disposed → PreloaderScene removed
 * }
 * ```
 *
 * ### Sub-flow (within a loop)
 *
 * Use `scope.run()` to launch a child flow whose scope is disposed on return:
 *
 * ```js
 * async function slotLoop(scope, ctx) {
 *     while (true) {
 *         const action = await scope.run(idle, ctx);       // idle scope disposed here
 *         if (action === "spin") {
 *             const data = await scope.run(spinning, ctx); // spinning scope disposed here
 *             await scope.run(presentation, ctx, data);
 *         }
 *     }
 * }
 * ```
 *
 * ## API
 *
 * | Method | Description |
 * |---|---|
 * | `on(signal, handler)` | Subscribe to a typed-signal; auto-disconnects on dispose. Returns connection. |
 * | `wait(signal)` | Returns a Promise that resolves on the first signal emission. Auto-disconnects. |
 * | `waitForAny(...signals)` | Returns a Promise that resolves when any signal fires. Auto-disconnects all. |
 * | `defer(fn)` | Register an arbitrary cleanup callback. |
 * | `run(fn, ...args)` | Run `fn(childScope, ...args)` in a child scope; disposes child on return. |
 * | `dispose()` | Execute all cleanups in reverse order. Safe to call multiple times. |
 *
 * @returns {{ on, wait, waitForAny, defer, run, dispose }} scope object
 */
export function createScope() {
    const cleanups = [];
    let disposed = false;

    const scope = {
        /**
         * Subscribe to a typed-signal with automatic cleanup on dispose.
         * @param {import('typed-signals').Signal} signal
         * @param {Function} handler
         * @returns {import('typed-signals').SignalConnection}
         */
        on(signal, handler) {
            const conn = signal.connect(handler);
            cleanups.push(() => conn.disconnect());
            return conn;
        },

        /**
         * Wait for a typed-signal to fire once. Resolves with the emitted value.
         * The connection is removed both on resolve and on dispose.
         * @param {import('typed-signals').Signal} signal
         * @returns {Promise<*>}
         */
        wait(signal) {
            return new Promise(resolve => {
                const conn = signal.connect((value) => {
                    conn.disconnect();
                    resolve(value);
                });
                cleanups.push(() => conn.disconnect());
            });
        },

        /**
         * Wait for the first of multiple typed-signals to fire.
         * All connections are removed on resolve and on dispose.
         * @param {...import('typed-signals').Signal} signals
         * @returns {Promise<{index: number, args: *[]}>}
         */
        waitForAny(...signals) {
            return new Promise(resolve => {
                const connections = signals.map((signal, i) => {
                    const conn = signal.connect((...args) => {
                        connections.forEach(c => c.disconnect());
                        resolve({ index: i, args });
                    });
                    cleanups.push(() => conn.disconnect());
                    return conn;
                });
            });
        },

        /**
         * Register a cleanup callback to run on dispose.
         * @param {() => void} fn
         */
        defer(fn) { cleanups.push(fn); },

        /**
         * Run an async function in a child scope.
         * The child is disposed when `fn` returns or throws.
         * If the parent is disposed while `fn` is still running,
         * the child is disposed as well (cancellation propagation).
         * @param {(scope, ...args) => Promise<*>} fn
         * @param {...*} args - forwarded to `fn` after the child scope
         * @returns {Promise<*>} return value of `fn`
         */
        async run(fn, ...args) {
            const child = createScope();
            cleanups.push(() => child.dispose());
            try { return await fn(child, ...args); }
            finally { child.dispose(); }
        },

        /**
         * Execute all registered cleanups in reverse (LIFO) order.
         * Idempotent — subsequent calls are no-ops.
         */
        dispose() {
            if (disposed) return;
            disposed = true;
            cleanups.splice(0).reverse().forEach(fn => fn());
        }
    };
    return scope;
}
