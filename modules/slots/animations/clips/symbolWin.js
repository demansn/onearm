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

    const destroySpine = new SpineTimeline({
        spine: "effect",
        atlas: "effect_symbols",
    });
    symbol.content.addChild(destroySpine);
    symbol.destroySpine = destroySpine;

    tl.set(destroySpine, { pixi: { alpha: 0, scaleX: 1.5, scaleY: 1.5 } });
    tl.add(skip ? gsap.timeline() : symbol.spine.timeline({ animation: "out", timeScale }));
    tl.add([
        skip ? gsap.to(symbol.spine, { alpha: 0, duration: 0.05 }) : null,
        tl.set(destroySpine, { alpha: 1 }),
        destroySpine.timeline({ animation: "effect_out", timeScale }),
    ], "-=0.05");

    return tl;
}
