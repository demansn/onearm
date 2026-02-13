import { createScope } from "./createScope.js";

/**
 * Flat sequential runner for the game flow chain.
 *
 * Each flow function receives its own scope and the shared game context.
 * To transition to the next flow, a function **returns** it (not awaits it).
 * The loop disposes the current scope **before** starting the next flow,
 * guaranteeing cleanup between steps.
 *
 * The chain ends when a flow returns a falsy value (`undefined` / `null`).
 * In practice the last flow (`slotLoop`) never returns — it runs an
 * infinite game loop internally using `scope.run()` for sub-flows.
 *
 * ```
 * logo → preloader → gameIntro → slotInit → slotLoop (∞)
 *  ↑        ↑            ↑           ↑
 *  scope    scope        scope       scope     ← each disposed before next starts
 * ```
 *
 * ```js
 * // boot chain example
 * async function preloader(scope, ctx) {
 *     scope.defer(() => ctx.scenes.remove("PreloaderScene"));
 *     await ctx.resources.load("main");
 *     return gameIntro;   // ← next flow; current scope will be disposed
 * }
 *
 * async function slotLoop(scope, ctx) {
 *     while (true) { ... } // ← never returns; chain stays here
 * }
 * ```
 *
 * Called from `Game.init()`:
 * ```js
 * gameFlowLoop(ctx, gameConfig.flow);
 * ```
 *
 * @param {Object} ctx  - Shared game context (services, scenes, data, etc.)
 * @param {(scope: Object, ctx: Object) => Promise<Function|void>} flow
 *        First flow function to execute
 */
export async function gameFlowLoop(ctx, flow) {
    let next = flow;
    while (next) {
        const scope = createScope();
        try {
            next = await next(scope, ctx);
        } finally {
            scope.dispose();
        }
    }
}
