import { sound } from "@pixi/sound";
import gsap from "gsap";

export default class AudioManager {
    constructor() {
        this.instances = [[], [], []];
        this.volumes = [1, 1, 1];
        this.muted = [false, false, false];
        this.globalMute = false;
        this._globalVolume = 100;

        this.setAllVolume(0);
        this.muteAll(true);
        this.muteSfx(true);
        this.muteMusic(true);
        this.muteAmbient(true);
    }

    playSfx(name, params = {}) {
        if (this.isMuteSfx) {
            return;
        }

        return this.play(name, params, track_id.SFX);
    }

    playMusic(name, params = {}) {
        return this.play(name, params, track_id.MUSIC);
    }

    playAmbient(name, params = {}) {
        return this.play(name, params, track_id.AMBIENT);
    }

    stopSfx(name) {
        return this.stop(name, track_id.SFX);
    }

    stopMusic(name) {
        return this.stop(name, track_id.MUSIC);
    }

    stopAmbient(name) {
        return this.stop(name, track_id.AMBIENT);
    }

    setVolumeSfx(volume) {
        return this.setTrackVolume(volume, track_id.SFX);
    }

    setVolumeMusic(volume) {
        return this.setTrackVolume(volume, track_id.MUSIC);
    }

    setVolumeAmbient(volume) {
        return this.setTrackVolume(volume, track_id.AMBIENT);
    }

    muteSfx(muted) {
        return this.muteTrack(muted, track_id.SFX);
    }

    muteMusic(muted) {
        return this.muteTrack(muted, track_id.MUSIC);
    }

    muteAmbient(muted) {
        return this.muteTrack(muted, track_id.AMBIENT);
    }

    get isMuteSfx() {
        return this.muted[track_id.SFX];
    }
    /**
     * @param {string} name
     * @param {Object} params
     * @param {number} trackId
     * @returns {Object} sound instance
     */
    play(name, params = {}, trackId = track_id.SFX) {
        if (!sound.exists(name)) {
            console.warn(`Sound "${name}" not found`);
            return null;
        }

        const volume = (params.volume || 1) * this.volumes[trackId];
        const loop = params.loop || false;
        const muted = this.muted[trackId] || this.globalMute;

        const instance = sound.find(name);

        instance.volume = volume;
        instance.muted = muted;
        instance.loop = loop;

        instance.play(null, () => this._removeInstance(instance, trackId));

        if (instance) {
            instance._soundName = name;
            instance._trackId = trackId;
            this.instances[trackId].push(instance);
        }

        return instance;
    }

    setAllVolume(volume) {
        sound.volumeAll = volume / 100;
        this._globalVolume = volume;
    }

    get globalVolume() {
        return this._globalVolume ?? 100;
    }

    get isGlobalMuted() {
        return this.globalMute;
    }

    /**
     * @param {string} name
     * @param {number} trackId
     */
    stop(name, trackId) {
        const instancesToStop = this.instances[trackId].filter(
            instance => instance._soundName === name,
        );

        instancesToStop.forEach(instance => {
            instance.stop();
            this._removeInstance(instance, trackId);
        });
    }

    /**
     * @param {string} name
     * @param {number} volume
     * @param {number} trackId
     */
    setVolumeByName(name, volume, trackId) {
        try {
            this.instances[trackId]
                .filter(instance => instance._soundName === name)
                .forEach(instance => {
                    instance.volume = (volume / 100) * this.volumes[trackId];
                });
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * @param {number} volume
     * @param {number} trackId
     */
    setTrackVolume(volume, trackId) {
        try {
            this.volumes[trackId] = volume / 100;
            this.instances[trackId].forEach(instance => {
                instance.volume = instance.volume * (volume / 100);
            });
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * @param {boolean} muted
     * @param {number} trackId
     */
    muteTrack(muted, trackId) {
        this.muted[trackId] = muted;
        this.instances[trackId].forEach(instance => {
            instance.muted = muted || this.globalMute;

            if (muted) {
                instance.pause();
            } else {
                instance.resume();
            }
        });
    }

    /**
     * @param {boolean} muted
     */
    muteAll(muted) {
        sound.toggleMuteAll(muted);
    }

    fadeMusic(volume, duration = 1) {
        const instances = this.instances[track_id.MUSIC];

        if (instances.length > 0) {
            const timeline = gsap.timeline();
            const tls = [];
            instances.map(instance => {
                tls.push(gsap.to(instance, { volume: volume, duration }));
            });

            timeline.add(tls);

            return timeline;
        }

        return null;
    }
    /**
     * @param {Object} instance
     * @param {number} trackId
     */
    _removeInstance(instance, trackId) {
        const index = this.instances[trackId].indexOf(instance);
        if (index !== -1) {
            this.instances[trackId].splice(index, 1);
        }
    }
}

export const track_id = {
    SFX: 0,
    MUSIC: 1,
    AMBIENT: 2,
};
Object.freeze(track_id);
