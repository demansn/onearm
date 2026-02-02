import gsap from "gsap";
import { Physics } from "@esotericsoftware/spine-pixi-v7";
import { Service } from "./Service.js";

/**
 * @typedef {Object} SpineGsapConfig
 * @property {string} animation
 * @property {number} [timeScale=1]
 * @property {boolean} [loop=false]
 * @property {number} [trackIndex=0]
 */

/**
 * @param {unknown} target
 * @returns {import("@esotericsoftware/spine-pixi-v7").Spine|null}
 */
function resolveSpineTarget(target) {
    if (!target) return null;
    const spineFromWrapper = target.spineObject;
    if (spineFromWrapper?.skeleton && spineFromWrapper?.state) {
        return spineFromWrapper;
    }
    if (target.skeleton && target.state) {
        return target;
    }
    return null;
}

/**
 * Extension guide:
 * - Add new SpineGsapConfig fields and parse them in init().
 * - If a field should affect tween duration, modify tween.duration() in init().
 * - If a field affects playback each frame, apply it inside render().
 * - For per-tween defaults, store computed values on "this" (data).
 * - For new behaviors that need setup, initialize them once when _initialized is false.
 * - Keep render() deterministic: derive output from progress and cached init data.
 */
gsap.registerPlugin({
    name: "spine",
    /**
     * @param {unknown} target
     * @param {SpineGsapConfig} value
     * @param {gsap.core.Tween} tween
     * @returns {boolean}
     */
    init(target, value, tween) {
        const config = value || {};
        const spine = resolveSpineTarget(target);
        if (!spine || !config.animation) return false;

        const animationData = spine.skeleton?.data?.findAnimation(config.animation);
        if (!animationData) return false;

        const timeScale = typeof config.timeScale === "number" && Number.isFinite(config.timeScale)
            ? config.timeScale
            : 1;

        this._spine = spine;
        this._animation = config.animation;
        this._loop = Boolean(config.loop);
        this._trackIndex = typeof config.trackIndex === "number" ? config.trackIndex : 0;
        this._animationDuration = animationData.duration;
        this._initialized = false;

        if (!("duration" in tween.vars)) {
            const safeTimeScale = timeScale > 0 ? timeScale : 1;
            const duration = this._animationDuration / safeTimeScale;
            tween.duration(duration);
        }

        return true;
    },
    /**
     * @param {number} progress
     * @param {object} data
     */
    render(progress, data) {
        const spine = data._spine;
        if (!spine) return;

        if (!data._initialized) {
            data._initialized = true;
            spine.cacheAsBitmap = false;
            spine.skeleton.setToSetupPose();
            spine.state.setAnimation(data._trackIndex, data._animation, data._loop);
            spine.state.apply(spine.skeleton);
            spine.update(0);
        }

        const animDuration = data._animationDuration || 0;
        let track = spine.state.getCurrent(data._trackIndex);
        if (!track) {
            spine.state.setAnimation(data._trackIndex, data._animation, data._loop);
            track = spine.state.getCurrent(data._trackIndex);
        }

        const time = animDuration * progress;
        if (track) {
            if (data._loop && animDuration > 0) {
                track.trackTime = time % animDuration;
            } else {
                track.trackTime = Math.min(time, animDuration);
            }
        }

        spine.skeleton.setToSetupPose();
        spine.state.apply(spine.skeleton);
        spine.skeleton.updateWorldTransform(Physics.pose);
        spine.update(0);
    },
});

export class SpineGsapPlugin extends Service {}
