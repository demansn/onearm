import gsap from "gsap";
import { CascadeAnimation } from "../CascadeAnimation.js";

/**
 * @description Builds cascade animation — symbols drop down and new symbols fall from top
 * @param {Object} reelsScene - Reels scene reference
 * @param {Object} options
 * @param {Object} options.movements - Symbol movements by column
 * @param {Object} options.newSymbols - New symbols by column
 * @param {number} [options.sfxIndex=0]
 * @param {boolean} [options.turbo=false]
 * @returns {gsap.core.Timeline}
 */
export function cascade(reelsScene, { movements, newSymbols, sfxIndex = 0, turbo = false } = {}) {
    const tl = gsap.timeline();
    const animation = new CascadeAnimation(reelsScene);

    tl.playSfx("cascade");
    tl.add(animation.build({ movements, newSymbols }, { sfxIndex }));

    if (turbo) tl.timeScale(1.2);

    return tl;
}
