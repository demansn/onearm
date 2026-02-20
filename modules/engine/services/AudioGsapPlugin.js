import gsap from "gsap";
import { Service } from "./Service.js";

let audioManagerRef = null;

const Timeline = gsap.core.Timeline;

Timeline.prototype.sounds = [];

Timeline.prototype.playSfx = function (name, params, position) {
    this.sounds.push(name);
    return this.call(() => {
        audioManagerRef?.playSfx(name, params);
    }, params || [], position);
};

Timeline.prototype.stopSfx = function (name, position) {
    return this.call(
        () => {
            this.sounds = this.sounds.filter(sound => sound !== name);
            audioManagerRef?.stopSfx(name);
        },
        [],
        position,
    );
};

Timeline.prototype.stopAllSfx = function () {
    this.sounds.forEach(sound => audioManagerRef?.stopSfx(sound));
    this.sounds = [];
};

Timeline.prototype.fadeCurrentMusic = function (ratio, duration, position) {
    return this.call(() => audioManagerRef?.fadeMusic(ratio, duration), [], position);
};

export class AudioGsapPlugin extends Service {
    init() {
        audioManagerRef = this.services.get("audio");
    }
}
