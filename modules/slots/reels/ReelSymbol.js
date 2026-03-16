import gsap from "gsap";
import { SpineAnimation, SpineTimeline } from "../../engine/index.js";
import { BaseContainer } from "../../engine/index.js";
import { symbolWin } from "../animations/clips/symbolWin.js";
import { symbolDestroy } from "../animations/clips/symbolDestroy.js";
import { symbolDrop } from "../animations/clips/symbolDrop.js";
import { symbolTrigger } from "../animations/clips/symbolTrigger.js";
import { multiplierFly } from "../animations/clips/multiplierFly.js";

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
            this.sprite = this.content.createObject(data.name, { ...data.sprite });
        }

        this.isSticky = false;
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
        return symbolWin(this, { skip: skipSpineAnimation });
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

        if (this.sprite) {
            gsap.killTweensOf(this.sprite.scale);
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
        return symbolDestroy(this);
    }

    playTriggerAnimation() {
        return symbolTrigger(this);
    }

    playDropAnimation() {
        return symbolDrop(this);
    }

    /**
     * @description Creates fly animation for multiplier to target position
     * @param {{x: number, y: number}} targetGlobalPos - Target global position for fly animation
     * @returns {gsap.core.Timeline}
     */
    getMultiplierFlyAnimation(targetGlobalPos) {
        return multiplierFly(this, targetGlobalPos);
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
