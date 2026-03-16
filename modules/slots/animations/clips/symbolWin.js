import gsap from "gsap";
import { SpineTimeline } from "../../../engine/index.js";

/**
 * @description Plays win animation on a reel symbol — spine "out" + effect overlay
 * @param {import('../../reels/ReelSymbol.js').ReelSymbol} symbol
 * @param {Object} [options]
 * @param {number} [options.timeScale=1.5]
 * @param {boolean} [options.skip=false] - Skip spine animation (turbo mode)
 * @returns {gsap.core.Timeline}
 */
export function symbolWin(symbol, { timeScale = 1.5, skip = false } = {}) {
    const tl = gsap.timeline();
    const body = symbol.spine;
    if (!body) return tl;

    const animation = body.animation;

    const destroySpine = new SpineTimeline({
        spine: "gool_overlay_effect",
        atlas: "gool_overlay_effect",
    });
    destroySpine.scale.set(0.3);
    symbol.content.addChild(destroySpine);
    symbol.destroySpine = destroySpine;


    tl.set(destroySpine, { pixi: { alpha: 0, scaleX: 0.3, scaleY: 0.3 } });
    tl.add(skip ? gsap.timeline() : body.timeline({ animation, timeScale }));
    tl.add([
        skip ? gsap.to(body, { alpha: 0, duration: 0.05 }) : null,
        tl.set(destroySpine, { alpha: 1 }),
        destroySpine.timeline({ animation: "gool_cascading_effect", timeScale }),
    ], "-=0.05");

    return tl;
}
