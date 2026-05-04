import gsap from "gsap";
import { Service } from "./Service.js";

let audioManagerRef = null;

const Timeline = gsap.core.Timeline;

function getSfxInstances(tl) {
    return (tl._sfxInstances ??= new Map());
}

function destroyInstances(instances) {
    instances.forEach(inst => {
        try {
            inst.destroy();
        } catch (_) {}
    });
}

function flushAllSfx(tl) {
    const map = tl._sfxInstances;
    if (!map) return;
    map.forEach((instances, name) => {
        audioManagerRef?.stopSfx(name);
        destroyInstances(instances);
    });
    map.clear();
}

Timeline.prototype.playSfx = function (name, params, position) {
    return this.call(() => {
        const sound = audioManagerRef?.playSfx(name, params);
        const inst = sound?._instances?.[sound._instances.length - 1];
        if (inst) {
            const map = getSfxInstances(this);
            if (!map.has(name)) map.set(name, []);
            map.get(name).push(inst);
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
    flushAllSfx(this);
};

Timeline.prototype.fadeCurrentMusic = function (ratio, duration, position) {
    return this.call(() => audioManagerRef?.fadeMusic(ratio, duration), [], position);
};

const _originalKill = Timeline.prototype.kill;
Timeline.prototype.kill = function (...args) {
    flushAllSfx(this);
    return _originalKill.apply(this, args);
};

export class AudioGsapPlugin extends Service {
    init() {
        audioManagerRef = this.services.get("audio");
    }
}
