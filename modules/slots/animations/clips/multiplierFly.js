import gsap from "gsap";

/**
 * @description Plays multiplier badge fly animation from symbol to target position
 * @param {import('../../reels/ReelSymbol.js').ReelSymbol} symbol
 * @param {{x: number, y: number}} targetGlobalPos
 * @returns {gsap.core.Timeline}
 */
export function multiplierFly(symbol, targetGlobalPos) {
    const tl = gsap.timeline();

    if (!symbol.multiplier) {
        return tl;
    }

    tl.set(symbol, { parentLayer: "overHud" });
    tl.playSfx("bomb_symbol_highlight");
    tl.add(symbol.spine.timeline({ animation: "out", timeScale: 1 }));
    tl.add(multiplierFlyTimeline(symbol, targetGlobalPos), "+=0.25");
    tl.set(symbol, { parentLayer: "none" });

    return tl;
}

function multiplierFlyTimeline(symbol, targetGlobalPos) {
    const tl = gsap.timeline({ timeScale: 1.5 });
    const multiplier = symbol.multiplier;
    const targetLocalPos = multiplier.toLocal(targetGlobalPos);

    tl.set(multiplier, { pixi: { scaleX: 1, scaleY: 1, x: multiplier.x, y: multiplier.y, alpha: 1 } });

    tl.add([
        gsap.timeline()
            .to(multiplier.scale, { x: 1.5, y: 1.5, duration: 0.2 })
            .to(multiplier.scale, { x: 0.8, y: 0.8, duration: 0.2 }),
        gsap.timeline()
            .to(multiplier, { delay: 0.35, alpha: 0, duration: 0.05 }),
        gsap.to(multiplier, {
            x: targetLocalPos.x - multiplier.width / 2,
            y: targetLocalPos.y - multiplier.height / 2,
            duration: 0.4,
            ease: "power2.inOut",
        }),
    ]);

    return tl;
}
