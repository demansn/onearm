import gsap from "gsap";

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
    const body = symbol.find("body");
    const frame = symbol.find("frame");
    const effect = symbol.find("effect");

    if (!body || !frame || !effect) {
        return tl;
    }

    tl.add([
        tl.set(body, { alpha: 1 }),
        tl.set(frame, { alpha: 1 }),
        skip ? gsap.timeline() : body.timeline({ animation: body.animation, timeScale }),
        skip ? gsap.timeline() : frame.timeline({ animation: frame.animation, timeScale }),
    ]);
    tl.add([
        tl.set(body, { alpha: 0}),
        tl.set(frame, { alpha: 0}),
        tl.set(effect, { alpha: 1 }),
        effect.timeline({ animation: effect.animation, timeScale }),
    ], "-=0.05");

    return tl;
}
