import gsap from "gsap";
import { winCounter } from "./winCounter.js";

/**
 * @description Orchestrates a single pay presentation — symbol win animations,
 * win counter, pay info display, and symbol removal.
 * @param {Object} pay - Pay data { positions, win }
 * @param {Object} options
 * @param {Object} options.reels - Reels scene reference
 * @param {Object} options.hud - HUD controller reference
 * @param {Object} options.counterTarget - Object with balance/win setters for counter animation
 * @param {boolean} [options.isTurbo=false]
 * @returns {gsap.core.Timeline}
 */
export function payPresentation(pay, { reels, hud, counterTarget, isTurbo = false } = {}) {
    const { positions, win } = pay;
    const tl = gsap.timeline();
    const duration = isTurbo ? 0 : 1;

    const sounds = ["low_payout_1", "low_payout_2", "low_payout_3", "low_payout_4"];
    tl.playSfx(sounds[Math.floor(Math.random() * sounds.length)]);

    const symbols = positions.map(({ row, column }) => reels.getSymbolByPosition({ row, column }));

    tl.add(() => reels.liftSymbolsForAnimation(symbols));

    const winAnimations = symbols.map(symbol => symbol.playWinAnimation(isTurbo));

    tl.add([
        ...winAnimations,
        winCounter(counterTarget, { win, duration, isTurbo }),
        hud.showPayInfo(pay),
    ]);
    tl.add(() => reels.restoreSymbols(symbols));
    tl.add(() => reels.removeSymbolsByPositions(positions));
    tl.add(reels.playPayAnimation({ positions, win }), "+0.75");

    return tl;
}
