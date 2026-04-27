import gsap from "gsap";
import { BaseContainer } from "../../engine/index.js";
import { getEngineContext } from "../../engine/common/core/EngineContext.js";
import { symbolWin } from "../animations/clips/symbolWin.js";
import { symbolDestroy } from "../animations/clips/symbolDestroy.js";
import { multiplierFly } from "../animations/clips/multiplierFly.js";

export class ReelSymbol extends BaseContainer {
    static ID = 0;

    constructor(data, parentReel) {
        super();
        this.data = data;
        this.parentReels = parentReel;
        this.ID = ReelSymbol.ID++;
        this.id = data.id;
        this.label = data.name;
        this.zIndex = data.zIndex ?? 0;

        this.content = this.createObject(BaseContainer, {
            position: { x: data.symbolWidth / 2, y: data.symbolHeight / 2 },
        });

        this._buildChildren(data.children);

        if (data.multiplier) {
            this.multiplier = this.find("multiplier");
            if (this.multiplier) {
                this.multiplier.text = `X${data.multiplier}`;
            }
        }
    }

    _buildChildren(children) {
        if (!children) return;
        for (const { type, label, parameters, ...props } of children) {
            const obj = this.content.createObject(type, { ...props, ...parameters });

            obj.label = label;
        }
    }

    get spine() {
        return this.find("body");
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
            this.multiplier.text = `X${data.multiplier}`;
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
        gsap.killTweensOf(this);
        gsap.killTweensOf(this.content);
        gsap.killTweensOf(this.content.scale);

        for (const obj of this.content.children) {
            gsap.killTweensOf(obj);
            if (obj.scale) gsap.killTweensOf(obj.scale);
            if (obj.goToStart && obj.animation) {
                obj.goToStart(obj.animation);
            }

            const initialParams = this.data.children?.find(child => child.label === obj.label)?.parameters;
            if (initialParams) {
                if (initialParams.scale) {
                    obj.scale.set(initialParams.scale.x, initialParams.scale.y);
                }
                if (initialParams.alpha !== undefined) {
                    obj.alpha = initialParams.alpha;
                }
            }
        }
        this.scale.set(1);
        this.content.scale.set(1);
    }

    /**
     * @description Plays destroy animation - scale down + fade out
     * @returns {gsap.core.Timeline}
     */
    playDestroyAnimation() {
        return symbolDestroy(this);
    }

    playTriggerAnimation() {
        return getEngineContext().services.get("animations").get("symbolTrigger")(this);
    }

    playDropAnimation() {
        return null;
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
        return this.y;
    }

    destroy(_options) {
        this.gotToIdle();
        super.destroy(_options);
    }
}
