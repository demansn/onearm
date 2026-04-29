import gsap from "gsap";
import { Service } from "./Service.js";

let audioManagerRef = null;

const Timeline = gsap.core.Timeline;

function getSfxInstances(tl) {
    if (!tl._sfxInstances) tl._sfxInstances = new Map();
    return tl._sfxInstances;
}

function destroyInstances(instances) {
    instances.forEach(inst => {
        try {
            inst.destroy();
        } catch (_) {}
    });
}

Timeline.prototype.playSfx = function (name, params, position) {
    return this.call(() => {
        const instance = audioManagerRef?.playSfx(name, params);
        if (instance) {
            const map = getSfxInstances(this);
            if (!map.has(name)) map.set(name, []);
            map.get(name).push(instance);
        }
    }, [], position);
};

Timeline.prototype.stopSfx = function (name, position) {
    return this.call(() => {
        audioManagerRef?.stopSfx(name);
        const map = getSfxInstances(this);
        destroyInstances(map.get(name) || []);
        map.delete(name);
    }, [], position);
};

Timeline.prototype.stopAllSfx = function () {
    const map = getSfxInstances(this);
    map.forEach((instances, name) => {
        audioManagerRef?.stopSfx(name);
        destroyInstances(instances);
    });
    map.clear();
};

Timeline.prototype.fadeCurrentMusic = function (ratio, duration, position) {
    return this.call(() => audioManagerRef?.fadeMusic(ratio, duration), [], position);
};

const _originalKill = Timeline.prototype.kill;
Timeline.prototype.kill = function (...args) {
    if (this._sfxInstances) {
        this._sfxInstances.forEach((instances, name) => {
            audioManagerRef?.stopSfx(name);
            destroyInstances(instances);
        });
        this._sfxInstances.clear();
    }
    return _originalKill.apply(this, args);
};

export class AudioGsapPlugin extends Service {
    init() {
        audioManagerRef = this.services.get("audio");
    }
}
