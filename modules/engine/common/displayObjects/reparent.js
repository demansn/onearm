/**
 * Reparents target into newParent preserving its on-screen (global) position.
 * NOTE: only translation is preserved. If parents differ in scale/rotation/skew,
 * the visual transform after reparent will not match.
 *
 * @param {import("pixi.js").Container} target
 * @param {import("pixi.js").Container} newParent
 * @returns {import("pixi.js").Container}
 */
export function reparentPreserveGlobal(target, newParent) {
    if (!target.parent || target.parent === newParent) return target;
    const globalPos = target.parent.toGlobal(target.position);
    newParent.addChild(target);
    const localPos = newParent.toLocal(globalPos);
    target.position.set(localPos.x, localPos.y);
    return target;
}
