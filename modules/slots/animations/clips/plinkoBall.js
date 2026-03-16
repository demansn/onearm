import gsap from "gsap";

/**
 * @description Animates a ball along a pre-recorded Plinko trajectory.
 * @param {import('pixi.js').Container} ball — display object to animate
 * @param {Object} options
 * @param {{ pocket: number, duration: number, keyframes: Array }} options.recording
 * @param {number} [options.timeScale=1]
 * @param {boolean} [options.sfx=true] — play bounce SFX on collision keyframes
 * @returns {gsap.core.Timeline}
 */
export function plinkoBall(ball, { recording, timeScale = 1, sfx = true } = {}) {
    const tl = gsap.timeline({ timeScale });
    const { keyframes } = recording;

    tl.set(ball, { x: keyframes[0].x, y: keyframes[0].y, alpha: 1 });

    for (let i = 1; i < keyframes.length; i++) {
        const prev = keyframes[i - 1];
        const kf = keyframes[i];
        tl.to(ball, {
            x: kf.x,
            y: kf.y,
            duration: kf.t - prev.t,
            ease: "none",
        });
        if (sfx && kf.bounce) {
            tl.call(() => tl.playSfx?.("plinko_bounce"), null, kf.t);
        }
    }

    return tl;
}
