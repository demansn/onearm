import gsap from "gsap";
import { Spine, Physics } from "@esotericsoftware/spine-pixi-v7";

import { SuperContainer } from "./SuperContainer.js";

export class SpineAnimation extends SuperContainer {
    /**
     * @type {Spine}
     */
    #spine;
    #animation;
    #attachments;
    #autoUpdate;
    #loop = false;
    isPlaying = false;

    /**
     * @param {Object} params
     * @param {string} params.spine - Spine skeleton name
     * @param {string} [params.atlas] - Atlas name (defaults to spine name)
     * @param {string} params.animation - Animation name to play
     * @param {string} [params.skin] - Skin name
     * @param {Object} [params.attachments] - Attachments config
     * @param {boolean} [params.autoPlay=false] - Auto play animation on init
     * @param {boolean} [params.loop=false] - Loop animation
     * @param {boolean} [params.autoUpdate=true] - Auto update spine (set false for manual timeline control)
     * @param {Object} [params.slotObjects] - Slot objects config
     */
    constructor({
        spine,
        atlas,
        animation,
        skin,
        attachments,
        autoPlay = false,
        loop = false,
        autoUpdate = true,
        slotObjects,
    }) {
        super();

        this.name = spine;
        this.#animation = animation;
        this.#attachments = attachments;
        this.#autoUpdate = autoUpdate;
        this.#loop = loop;

        this.#spine = Spine.from({
            skeleton: `${spine}Data`,
            atlas: `${atlas || spine}Atlas`,
            autoUpdate: autoUpdate,
        });

        if (skin) {
            this.#spine.skeleton.setSkinByName(skin);
            this.#spine.skeleton.setSlotsToSetupPose();
        }

        this.addChild(this.#spine);
        this.goToStart(true);

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

        if (autoPlay) {
            this.play(loop);
        }
    }

    get spineObject() {
        return this.#spine;
    }

    #update(dl) {
        this.#spine.update(dl / 100);
    }

    setAnimation(animation) {
        this.#animation = animation;
    }

    setTimeScale(timeScale) {
        this.#spine.state.timeScale = timeScale;
    }

    play(loop, onStart = () => {}, onComplete = () => {}) {
        if (this.playTimeLine) {
            this.playTimeLine.kill();
            this.playTimeLine = null;
        }
        this.playTimeLine = gsap.timeline();

        const duration = this.getAnimationDuration();

        this.#spine.skeleton.setToSetupPose();

        this.playTimeLine.to(this.#spine, {
            duration: duration,
            onStart: () => {
                this.#spine.cacheAsBitmap = false;
                if (this.#spine.state.timeScale === 0) {
                    this.#spine.state.timeScale = 1;
                }
                this.#spine.state.clearTracks();
                this.#spine.state.setAnimation(0, this.#animation, loop);
                this.#spine.skeleton.setToSetupPose();
                this.isPlaying = true;
                onStart && onStart();
            },
            onComplete: () => {
                this.isPlaying = false;
                onComplete && onComplete();
            },
        });

        return this.playTimeLine;
    }

    setMix(from, to, duration) {
        this.#spine.state.data.setMix(from, to, duration);
    }

    gotToEnd(notCache = false) {
        this.#spine.cacheAsBitmap = false;
        this.#spine.state.timeScale = 1;
        this.#spine.skeleton.setToSetupPose();
        this.#spine.state.setAnimation(0, this.#animation, false);
        this.#spine.state.update(1000000);
        this.#spine.state.apply(this.#spine.skeleton);
        this.#spine.state.timeScale = 0;
        if (!notCache) {
            this.#spine.cacheAsBitmap = true;
        }
    }

    goToStart(notCache = false) {
        this.#spine.cacheAsBitmap = false;
        this.#spine.state.timeScale = 1;
        this.#spine.skeleton.setToSetupPose();
        this.#spine.state.setAnimation(0, this.#animation, false);
        this.#spine.state.apply(this.#spine.skeleton);
        this.#spine.state.timeScale = 0;
        if (!notCache) {
            this.#spine.cacheAsBitmap = true;
        }
    }

    goToTime(time) {
        this.#spine.state.update(time);
    }

    stop() {
        gsap.killTweensOf(this.#spine);
        this.#spine.state.clearTracks();

        if (this.playTimeLine) {
            this.playTimeLine.kill();
            this.playTimeLine = null;
        }
        this.isPlaying = false;
    }

    getAnimationDuration() {
        return this.#spine.skeleton.data.findAnimation(this.#animation).duration / this.getTimeScale();
    }

    getTimeScale() {
        return this.#spine.state.timeScale;
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
