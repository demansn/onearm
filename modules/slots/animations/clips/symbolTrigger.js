import gsap from "gsap";

/**
 * @description Plays trigger animation (e.g. free spins trigger) on a reel symbol
 * @param {import('../../reels/ReelSymbol.js').ReelSymbol} symbol
 * @param {Object} [options]
 * @param {number} [options.timeScale=1.5]
 * @returns {gsap.core.Timeline}
 */
export function symbolTrigger(symbol, { timeScale = 1.5 } = {}) {
    const tl = gsap.timeline();

    tl.set(symbol, { parentLayer: "overHud" });
    tl.add(symbol.spine.timeline({ animation: "out", timeScale }));
    tl.set(symbol, { parentLayer: "none" });

    return tl;
}
