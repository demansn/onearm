import { Service } from "../../engine/services/Service.js";
import * as defaultClips from "./clips/index.js";

/**
 * @description Registry of animation clip functions.
 * Default clips from the engine are registered on init.
 * Games can override any clip via GameConfig.animations.
 */
export class AnimationRegistry extends Service {
    _clips = new Map();

    async init() {
        this.registerAll(defaultClips);

        if (this.options) {
            this.registerAll(this.options);
        }
    }

    /**
     * @param {string} name
     * @param {Function} factory
     */
    register(name, factory) {
        this._clips.set(name, factory);
    }

    /**
     * @param {Object} module - Object of { name: factory } pairs
     */
    registerAll(module) {
        for (const [name, fn] of Object.entries(module)) {
            if (typeof fn === "function") this._clips.set(name, fn);
        }
    }

    /**
     * @param {string} name
     * @returns {Function}
     */
    get(name) {
        const clip = this._clips.get(name);
        if (!clip) throw new Error(`Animation clip "${name}" not registered`);
        return clip;
    }

    /**
     * @param {string} name
     * @returns {boolean}
     */
    has(name) {
        return this._clips.has(name);
    }
}
