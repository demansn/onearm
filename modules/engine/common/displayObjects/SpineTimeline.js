import gsap from "gsap";
import { Spine, Physics } from "@esotericsoftware/spine-pixi-v7";

import { SuperContainer } from "./SuperContainer";

/**
 * Spine animation controlled exclusively by GSAP timeline
 * Supports multiple animations with individual timeScale
 */
export class SpineTimeline extends SuperContainer {
    /**
     * @type {Spine}
     */
    #spine;
    #currentAnimation = null;

    /**
     * @param {Object} params
     * @param {string} params.spine - Spine skeleton name
     * @param {string} [params.atlas] - Atlas name (defaults to spine name)
     * @param {string} [params.skin] - Skin name
     * @param {Object} [params.slotObjects] - Slot objects config
     * @param {string} [params.animation] - Animation name to play
     * @param {number} [params.time = 0] - Time to start the animation
     */
    constructor({ spine, atlas, skin, slotObjects, animation, time = 0 }) {
        super();

        this.name = spine;

        this.#spine = Spine.from({
            skeleton: `${spine}Data`,
            atlas: `${atlas || spine}Atlas`,
            autoUpdate: false,
        });

        if (skin) {
            this.#spine.skeleton.setSkinByName(skin);
            this.#spine.skeleton.setSlotsToSetupPose();
        }

        this.addChild(this.#spine);

        if (slotObjects) {
            for (const slot in slotObjects) {
                const object = slotObjects[slot];

                if (typeof object === "string") {
                    this.#spine.addSlotObject(slot, this.addObject(object, { anchor: 0.5 }));
                } else {
                    this.#spine.addSlotObject(slot, object);
                }
            }
        }

        this.#spine.skeleton.setToSetupPose();

        if (animation) {
            this.setAnimationTime(animation, time);
        }
    }

    get spineObject() {
        return this.#spine;
    }

    /**
     * Gets the duration of an animation
     * @param {string} animation - Animation name
     * @returns {number} Duration in seconds
     */
    getAnimationDuration(animation) {
        return this.#spine.skeleton.data.findAnimation(animation).duration;
    }

    /**
     * Sets the animation to a specific time position
     * @param {string} animation - Animation name
     * @param {number} time - Time in seconds
     * @param {boolean} [loop=false] - Loop animation
     */
    setAnimationTime(animation, time, loop = false) {
        this.#spine.cacheAsBitmap = false;
        this.#spine.skeleton.setToSetupPose();
        this.#spine.state.setAnimation(0, animation, loop);

        const track = this.#spine.state.getCurrent(0);
        if (track) {
            track.trackTime = time;
        }

        this.#spine.state.apply(this.#spine.skeleton);
        this.#spine.skeleton.updateWorldTransform(Physics.pose);
        this.#spine.update(0);
    }

    /**
     * Goes to the start of an animation
     * @param {string} animation - Animation name
     */
    goToStart(animation) {
        this.setAnimationTime(animation, 0);
    }

    /**
     * Goes to the end of an animation
     * @param {string} animation - Animation name
     */
    goToEnd(animation) {
        const duration = this.getAnimationDuration(animation);
        this.setAnimationTime(animation, duration);
    }

    /**
     * Creates a GSAP timeline that controls the spine animation
     * @param {Object} params
     * @param {string} params.animation - Animation name to play
     * @param {number} [params.timeScale=1] - Speed multiplier for the animation
     * @param {boolean} [params.loop=false] - Loop the animation
     * @param {number} [params.duration] - Override animation duration
     * @param {Function} [params.onStart] - Callback when animation starts
     * @param {Function} [params.onComplete] - Callback when animation completes
     * @param {Function} [params.onUpdate] - Callback on each update
     * @returns {gsap.core.Timeline} GSAP timeline controlling the spine animation
     */
    timeline({
        animation,
        timeScale = 1,
        loop = false,
        duration: customDuration,
        onStart,
        onComplete,
        onUpdate,
    }) {
        const animDuration = this.getAnimationDuration(animation);
        const duration = (customDuration ?? animDuration) / timeScale;

        const tl = gsap.timeline();
        const proxy = { time: 0 };
        let initialized = false;

        const initAnimation = () => {
            if (initialized) return;
            initialized = true;
            this.#spine.cacheAsBitmap = false;
            this.#currentAnimation = animation;
            this.#spine.skeleton.setToSetupPose();
            this.#spine.state.setAnimation(0, animation, loop);
            this.#spine.state.apply(this.#spine.skeleton);
            this.#spine.update(0);
        };

        tl.to(proxy, {
            time: animDuration,
            duration: duration,
            ease: "none",
            onStart: () => {
                initAnimation();
                onStart?.();
            },
            onUpdate: () => {
                initAnimation();
                this.#spine.skeleton.setToSetupPose();

                const track = this.#spine.state.getCurrent(0);
                if (track) {
                    if (loop) {
                        track.trackTime = proxy.time % animDuration;
                    } else {
                        track.trackTime = Math.min(proxy.time, animDuration);
                    }
                }

                this.#spine.state.apply(this.#spine.skeleton);
                this.#spine.skeleton.updateWorldTransform(Physics.pose);
                this.#spine.update(0);
                onUpdate?.();
            },
            onComplete: () => {
                onComplete?.();
            },
            onReverseComplete: () => {
                onComplete?.();
            },
        });

        return tl;
    }

    /**
     * Sets mix duration between two animations
     * @param {string} from - From animation name
     * @param {string} to - To animation name
     * @param {number} duration - Mix duration in seconds
     */
    setMix(from, to, duration) {
        this.#spine.state.data.setMix(from, to, duration);
    }

    destroy(_options) {
        gsap.killTweensOf(this, true);
        gsap.killTweensOf(this.#spine, true);

        if (this.#spine?.state) {
            this.#spine.state.clearTracks();
            this.#spine.state.clearListeners();
        }

        this.#spine?.destroy();
        this.#spine = null;

        super.destroy(_options);
    }
}
