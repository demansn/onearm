import gsap from "gsap";
import { Spine, Physics } from "@esotericsoftware/spine-pixi-v8";

import { BaseContainer } from "../core/BaseContainer.js";

export class SpineObject extends BaseContainer {
    /** @type {Spine} */
    #spine;

    animation;
    isPlaying = false;

    /**
     * @param {Object} params
     * @param {string} params.spine - Spine skeleton name
     * @param {string} [params.atlas] - Atlas name (defaults to spine name)
     * @param {string} [params.skin] - Skin name
     * @param {string} [params.animation] - Animation name
     * @param {Object} [params.slotObjects] - Slot objects config
     * @param {boolean} [params.autoPlay=false] - Auto play animation
     * @param {boolean} [params.loop=false] - Loop animation
     * @param {number} [params.time] - Initial time position
     */
    constructor({ spine, atlas, skin, animation, slotObjects, autoPlay = false, loop = false, time }) {
        super();

        this.label = spine;
        this.animation = animation;
        this.autoPlay = autoPlay;
        this.loop = loop;

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
                } else if (object !== null && typeof object === "object" && typeof object.type === "string") {
                    const { type, ...rest } = object;
                    this.#spine.addSlotObject(slot, this.addObject(type, rest));
                } else {
                    this.#spine.addSlotObject(slot, object);
                }
            }
        }

        if (animation && time !== undefined) {
            this.setTime(animation, time);
        } else if (animation) {
            this.#applyPose(animation, 0, true);
        }

        if (autoPlay) {
            this.play(loop);
        }
    }

    get spineObject() {
        return this.#spine;
    }

    /**
     * Play animation in real-time mode.
     * Supports two signatures:
     *   play(loop, onStart, onComplete) — legacy
     *   play(animation?, { loop?, timeScale?, onComplete? })
     */
    play(animationOrLoop, optionsOrOnStart, onCompleteArg) {
        let anim = this.animation;
        let loop = false;
        let onComplete;

        if (typeof animationOrLoop === "boolean") {
            loop = animationOrLoop;
            const onStart = typeof optionsOrOnStart === "function" ? optionsOrOnStart : undefined;
            onComplete = typeof onCompleteArg === "function" ? onCompleteArg : undefined;
            onStart?.();
        } else if (typeof animationOrLoop === "string") {
            anim = animationOrLoop;
            const opts = optionsOrOnStart || {};
            loop = Boolean(opts.loop);
            onComplete = opts.onComplete;
            if (typeof opts.timeScale === "number") {
                this.#spine.state.timeScale = opts.timeScale;
            }
        } else if (animationOrLoop && typeof animationOrLoop === "object") {
            const opts = animationOrLoop;
            loop = Boolean(opts.loop);
            onComplete = opts.onComplete;
            if (typeof opts.timeScale === "number") {
                this.#spine.state.timeScale = opts.timeScale;
            }
        }

        this.#spine.autoUpdate = true;
        this.#spine.cacheAsTexture(false);
        this.#spine.skeleton.setToSetupPose();

        if (this.#spine.state.timeScale === 0) {
            this.#spine.state.timeScale = 1;
        }

        this.#spine.state.clearTracks();
        this.#spine.state.setAnimation(0, anim, loop);
        this.#spine.state.apply(this.#spine.skeleton);
        this.#spine.skeleton.setToSetupPose();

        this.#spine.state.clearListeners();
        this.#spine.state.addListener({
            complete: () => {
                this.isPlaying = false;
                onComplete?.();
            },
        });

        this.isPlaying = true;
    }

    stop() {
        gsap.killTweensOf(this.#spine);
        this.#spine.autoUpdate = false;
        this.#spine.state.clearTracks();

        if (this.playTimeLine) {
            this.playTimeLine.kill();
            this.playTimeLine = null;
        }
        this.isPlaying = false;
    }

    /**
     * Creates a GSAP timeline controlling the spine animation.
     * @param {Object} params
     * @param {string} [params.animation] - Animation name (defaults to this.animation)
     * @param {number} [params.timeScale=1] - Speed multiplier
     * @param {boolean} [params.loop=false] - Loop
     * @param {number} [params.duration] - Override duration
     * @param {Function} [params.onStart]
     * @param {Function} [params.onComplete]
     * @param {Function} [params.onUpdate]
     * @returns {gsap.core.Timeline}
     */
    timeline({
        animation,
        timeScale = 1,
        loop = false,
        duration: customDuration,
        onStart,
        onComplete,
        onUpdate,
    } = {}) {
        const anim = animation || this.animation;
        const animDuration = this.#spine.skeleton.data.findAnimation(anim).duration;
        const duration = (customDuration ?? animDuration) / timeScale;

        this.#spine.autoUpdate = false;

        const tl = gsap.timeline();
        const proxy = { time: 0 };
        let initialized = false;

        const initAnimation = () => {
            if (initialized) return;
            initialized = true;
            this.#spine.cacheAsTexture(false);
            this.#spine.skeleton.setToSetupPose();
            this.#spine.state.setAnimation(0, anim, loop);
            this.#spine.state.apply(this.#spine.skeleton);
            this.#spine.update(0);
        };

        tl.to(proxy, {
            time: animDuration,
            duration,
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
     * Sets spine to a specific time position (static pose).
     * @param {string} animation
     * @param {number} time
     * @param {boolean} [loop=false]
     */
    setTime(animation, time, loop = false) {
        this.#spine.autoUpdate = false;
        this.#applyPose(animation, time, true);
    }

    setAnimationTime(animation, time, loop = false) {
        this.setTime(animation, time, loop);
    }

    goToStart(animation) {
        const anim = (typeof animation === "string" && animation) || this.animation;
        this.#spine.autoUpdate = false;
        this.#applyPose(anim, 0, true);
    }

    goToEnd(animation) {
        const anim = (typeof animation === "string" && animation) || this.animation;
        const duration = this.#spine.skeleton.data.findAnimation(anim).duration;
        this.#spine.autoUpdate = false;
        this.#applyPose(anim, duration, true);
    }

    gotToEnd(animation) {
        this.goToEnd(animation);
    }

    /**
     * @param {string} [animation]
     * @returns {number}
     */
    getAnimationDuration(animation) {
        const anim = animation || this.animation;
        return this.#spine.skeleton.data.findAnimation(anim).duration;
    }

    setAnimation(animation) {
        this.animation = animation;
    }

    setTimeScale(timeScale) {
        this.#spine.state.timeScale = timeScale;
    }

    getTimeScale() {
        return this.#spine.state.timeScale || 1;
    }

    setMix(from, to, duration) {
        this.#spine.state.data.setMix(from, to, duration);
    }

    #applyPose(animation, time, cache) {
        this.#spine.cacheAsTexture(false);
        this.#spine.skeleton.setToSetupPose();
        this.#spine.state.setAnimation(0, animation, false);

        const track = this.#spine.state.getCurrent(0);
        if (track) {
            track.trackTime = time;
        }

        this.#spine.state.apply(this.#spine.skeleton);
        this.#spine.skeleton.updateWorldTransform(Physics.pose);
        this.#spine.update(0);

        if (cache) {
            this.#spine.cacheAsTexture(true);
        }
    }

    destroy(_options) {
        this.stop();

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

export { SpineObject as SpineAnimation };
export { SpineObject as SpineTimeline };
