import gsap from "gsap";

/**
 * @description Animates win counter — increments balance and win on a target object.
 * Target must have `balance` and `win` setters (e.g. PaysAct instance).
 * @param {Object} target - Object with balance/win setters
 * @param {Object} options
 * @param {number} options.win - Win amount to add
 * @param {number} options.duration - Animation duration (0 for instant)
 * @param {boolean} [options.isTurbo=false] - Instant mode
 * @param {Object} [options.sfx] - Sound effect names
 * @param {string} [options.sfx.loop="counter_loop"]
 * @param {string} [options.sfx.end="counter_end"]
 * @returns {gsap.core.Timeline}
 */
export function winCounter(target, { win, duration, isTurbo = false, sfx = {} } = {}) {
    const { loop = "counter_loop", end = "counter_end" } = sfx;
    const tl = gsap.timeline();

    if (isTurbo) {
        tl.add(() => {
            target.balance += win;
            target.win += win;
        });
        tl.playSfx(end);
        return tl;
    }

    tl.playSfx(loop, { loop: true });
    tl.add([
        gsap.to(target, { balance: `+=${win}`, duration }),
        gsap.to(target, { win: `+=${win}`, duration }),
    ]);
    tl.stopSfx(loop);
    tl.playSfx(end);

    return tl;
}
