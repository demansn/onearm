import gsap from "gsap";
import { SpineAnimation, SpineTimeline } from "../../engine/index.js";
import { BaseContainer } from "../../engine/index.js";

export class ReelSymbol extends BaseContainer {
    static ID = 0;

    /**
     *
     * @type {SpineAnimation | null}
     */
    spine = null;

    constructor(data, parenReel) {
        super();
        this.data = data;
        this.parentReels = parenReel;
        this.ID = ReelSymbol.ID++;
        this.id = data.id;
        this.label = data.name;
        this.zIndex = data.zIndex ?? 0;
        this.winTimeLine = gsap.timeline();

        this.content = this.createObject(BaseContainer, {
            x: data.symbolWidth / 2,
            y: data.symbolHeight / 2,
        });

        if (data.bg) {
            this.symbolBg = this.content.createObject(data.bg, { anchor: [0.5,0.5] });
        }

        if (data.frame) {
            this.symbolFrame = this.content.createObject(data.frame, { anchor: [0.5,0.5] });
        }

        if (data.drop) {
            this.spine = this.createSpine(data.drop);
        } else if (data.sprite) {
            this.spirte = this.content.createObject(data.name, { ...data.sprite });
        }

        this.isSticky = false;

        if (data.multiplier) {
            this.multiplier = this.content.createObject("SymbolMultiplier", { params: { multiplier: data.multiplier }});
            this.multiplier.pivot.set(this.multiplier.width / 2, this.multiplier.height / 2);
            this.multiplierInitialPosition = { x: this.multiplier.x, y: this.multiplier.y };
        }
    }

    reset(data) {
        this.data = data;
        this.gotToIdle();
            if (this.multiplier) {
            this.multiplier.alpha = 1;
                this.multiplier.scale.set(1);
                this.multiplier.parentLayer = null;
                if (this.multiplierInitialPosition) {
                    this.multiplier.x = this.multiplierInitialPosition.x;
                    this.multiplier.y = this.multiplierInitialPosition.y;
                }
                this.multiplier.get("text").text = `X${data.multiplier}`;
                this.multiplier.pivot.set(this.multiplier.width / 2, this.multiplier.height / 2);

            }
        }

    /**
     * @param {boolean} [skipSpineAnimation=false] - If true, skip spine animation and go to end instantly
     * @returns {gsap.core.Timeline}
     */
    playWinAnimation(skipSpineAnimation = false) {
        const tl = gsap.timeline();

        this.destroySpine = new SpineTimeline({
            spine: "EffectSymbol",
            atlas: "EffectSymbolsAnimation",
        });
        this.content.addChild(this.destroySpine);

        tl.set(this.destroySpine, {pixi: { alpha: 0, scaleX: 1.5, scaleY: 1.5 }});
        tl.add(skipSpineAnimation ? gsap.timeline() : this.spine.timeline({ animation: "out", timeScale: 1.5 }));
        tl.add([
            skipSpineAnimation ? gsap.to(this.spine, { alpha: 0, duration: 0.05 }) : null,
            tl.set(this.destroySpine, {alpha: 1}),
            this.destroySpine.timeline({ animation: "effect_out", timeScale: 1.5 }),
        ], "-=0.05");

        return tl;
    }

    gotToIdle() {
        this.alpha = 1;
        this.visible = true;

        this.parentLayer = null;
        gsap.killTweensOf(this);
        gsap.killTweensOf(this.content);
        gsap.killTweensOf(this.content.scale);

        if (this.spine) {
            gsap.killTweensOf(this.spine);

            this.spine.alpha = 1;
            this.spine.visible = true;
            this.spine.goToStart(this.data.win.animation);
        }

        if (this.spirte) {
            gsap.killTweensOf(this.spirte.scale);
        }

        if (this.destroySpine) {
            gsap.killTweensOf(this.destroySpine);
            this.destroySpine.destroy();
            this.content.removeChild(this.destroySpine);
            this.destroySpine = null;
        }

        if (this.multiplier) {
            gsap.killTweensOf(this.multiplier);
            gsap.killTweensOf(this.multiplier.scale);
        }

        this.scale.set(1);
        this.content.scale.set(1);
    }

    createSpine(data) {
        const spine = this.content.createObject(SpineTimeline, {
            params: {...data, time: 2},
            ...(data.parameters || {}),
        });
        spine.scale.set(1.8);

        return spine;
    }

    /**
     * @description Plays destroy animation - scale down + fade out
     * @returns {gsap.core.Timeline}
     */
    playDestroyAnimation() {
        const tl = gsap.timeline();

        return tl;
    }

    playTriggerAnimation() {
        const tl = gsap.timeline();

        tl.set(this, { parentLayer: "overHud" });
        tl.add(this.spine.timeline({ animation: "out", timeScale: 1.5 }));
        tl.set(this, { parentLayer: "none" });

        return tl;
    }

    playDropAnimation() {
        return this.spine.timeline({  animation: "in", timeScale: 1.4});
    }

    /**
     * @description Creates fly animation for multiplier to target position
     * @param {{x: number, y: number}} targetGlobalPos - Target global position for fly animation
     * @returns {gsap.core.Timeline}
     */
    getMultiplierFlyAnimation(targetGlobalPos) {
        const tl = gsap.timeline();

        if (!this.multiplier) {
            return tl;
        }

        tl.set(this, { parentLayer: "overHud" });
        tl.playSfx("bomb_symbol_highlight");
        tl.add(this.spine.timeline({ animation: "out", timeScale: 1 }));
        tl.add(this.getMultiplierFlyAnimationTimeline(targetGlobalPos), "+=0.25");
        tl.set(this, { parentLayer: "none" });

        return tl;
    }

    getMultiplierFlyAnimationTimeline(targetGlobalPos) {
        const tl = gsap.timeline({ timeScale: 1.5 });

        const targetLocalPos = this.multiplier.toLocal(targetGlobalPos);

        tl.set(this.multiplier, { pixi: { scaleX: 1, scaleY: 1, x: this.multiplier.x, y: this.multiplier.y, alpha: 1 } });

        tl.add([
            gsap.timeline().to(this.multiplier.scale, { x: 1.5, y: 1.5, duration: 0.2 }).to(this.multiplier.scale, {x: 0.8, y: 0.8, duration: 0.2}),
            gsap.timeline().to(this.multiplier, { delay: 0.35, alpha: 0, duration: 0.05}),
            gsap.to(this.multiplier, {
                x: targetLocalPos.x - this.multiplier.width / 2,
                y: targetLocalPos.y - this.multiplier.height / 2,
                duration: 0.4,
                ease: "power2.inOut",
            }),
        ]);

        return tl;
    }

    getTopBounds() {
        if (!this.sprite) {
            return this.y;
        }

        return (
            this.y + this.parentReels.symbolHeight / 2 - this.sprite.height * this.sprite.anchor.y
        );
    }

    destroy(_options) {
        this.gotToIdle();

        if (this.destroySpine) {
            this.destroySpine.destroy();
            this.destroySpine = null;
        }

        if (this.spine) {
            this.spine.destroy();
            this.spine = null;
        }

        if (this.winTimeLine) {
            this.winTimeLine.kill();
            this.winTimeLine = null;
        }

        super.destroy(_options);
    }
}
