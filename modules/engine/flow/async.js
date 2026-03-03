/**
 * Standalone async utilities for use in flows, scenes, and behaviors.
 *
 * For scope-aware versions with automatic cleanup, use `scope.wait()` and
 * `scope.waitForAny()` from {@link createScope}.
 */

/**
 * Wait for the given number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for a typed-signal to fire once. Resolves with the first argument.
 * The connection is disconnected immediately after the signal fires.
 * @param {import('typed-signals').Signal} signal
 * @returns {Promise<*>}
 */
export function waitForSignal(signal) {
    return new Promise(resolve => {
        const conn = signal.connect((...args) => {
            conn.disconnect();
            resolve(args[0]);
        });
    });
}

/**
 * Wait for the first of multiple typed-signals to fire.
 * All connections are disconnected when any signal fires.
 * @param {...import('typed-signals').Signal} signals
 * @returns {Promise<{index: number, args: *[]}>}
 */
export function waitForAny(...signals) {
    return new Promise(resolve => {
        const connections = signals.map((signal, i) =>
            signal.connect((...args) => {
                connections.forEach(c => c.disconnect());
                resolve({ index: i, args });
            }),
        );
    });
}

/**
 * Wait until a predicate returns true, checking every animation frame.
 * @param {() => boolean} predicate
 * @returns {Promise<void>}
 */
export function waitUntil(predicate) {
    return new Promise(resolve => {
        const check = () => predicate() ? resolve() : requestAnimationFrame(check);
        check();
    });
}
