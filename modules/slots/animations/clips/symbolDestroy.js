import gsap from "gsap";

/**
 * @description Plays destroy animation on a reel symbol
 * @param {import('../../reels/ReelSymbol.js').ReelSymbol} symbol
 * @returns {gsap.core.Timeline}
 */
export function symbolDestroy(symbol) {
    return gsap.timeline();
}
