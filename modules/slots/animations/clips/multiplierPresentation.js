import gsap from "gsap";

/**
 * @description Orchestrates multiplier fly animations and win counter update.
 * Each multiplier badge flies to the tumble win display, then the final win is revealed.
 * @param {Object} result - Multiplier step result { multipliers, win }
 * @param {Object} options
 * @param {Object} options.hud - HUD controller
 * @param {Object} options.reelsScene - Reels scene reference
 * @param {Object} options.currencyFormatter - Currency formatter service
 * @param {Object} options.winTarget - Object with `win` setter for counter animation
 * @returns {gsap.core.Timeline}
 */
export function multiplierPresentation(result, { hud, reelsScene, currencyFormatter, winTarget } = {}) {
    const tl = gsap.timeline();
    const { multipliers, win } = result;
    const { total: finalWin, beforeMultiplier: winBeforeMultiplier } = win;
    const targetPos = hud.getTumbleWinTargetPosition();
    const tumbleWinValues = hud.layout.findAll("tumbleWinValue");

    let accumulatedMultiplier = 0;

    tl.add(() => hud.setTumbleWinValue(win.winBeforePay));
    tl.set(tumbleWinValues, { money: winBeforeMultiplier });

    multipliers.forEach(({ row, column, multiplier }) => {
        accumulatedMultiplier += multiplier;
        tl.add(reelsScene.getMultiplierFlyAnimation(row, column, targetPos));
        tl.set(tumbleWinValues, {
            pixi: { text: `${currencyFormatter.format(winBeforeMultiplier)} x ${accumulatedMultiplier}` },
        }, "-=0.1");
    });

    tl.to(winTarget, { duration: 1 });
    tl.playSfx("multiplier_split_anim");
    tl.to(tumbleWinValues, { pixi: { scaleX: 1.3, scaleY: 1.3 }, duration: 0.2, ease: "back.out(2)" });
    tl.to(tumbleWinValues, { pixi: { scaleX: 1, scaleY: 1 }, delay: 0.2, duration: 0.3 });
    tl.playSfx("multiplier_merge_anim");
    tl.add([
        gsap.to(tumbleWinValues, { money: finalWin, duration: 0.5 }),
        gsap.to(winTarget, { win: `+=${finalWin - winBeforeMultiplier}`, duration: 0.5 }),
    ], "-=0.2");
    tl.add(gsap.delayedCall(0.2, () => {}));

    return tl;
}
