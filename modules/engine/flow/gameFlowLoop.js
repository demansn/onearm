/**
 * Main game flow loop.
 * Executes flows sequentially until null is returned.
 *
 * Each flow's run() returns the next flow to execute.
 * The loop ends when a flow returns null.
 *
 * @param {Object} ctx - Game context with services and managers
 * @param {new (ctx: Object) => import('./BaseFlow.js').BaseFlow} FirstFlow - First flow class to start with
 */
export async function gameFlowLoop(ctx, FirstFlow) {
    let next = new FirstFlow(ctx);

    while (next) {
        next = await next.execute();
    }
}
