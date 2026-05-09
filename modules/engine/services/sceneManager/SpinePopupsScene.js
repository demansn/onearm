import gsap from "gsap";
import { Signal } from "typed-signals";
import { Scene } from "./Scene.js";
import { WinValueCounter } from "../../common/WinValueCounter.js";

export class SpinePopupsScene extends Scene {
    constructor(parameters) {
        super({ layer: "popups", ...parameters });

        this.onComplete = new Signal();
        this.visible = false;
    }

    create(options) {
        super.create(options);

        const config = options.config || {};
        this.popupConfig = config;
        this.sequenceLevel = config.sequenceParam ? options[config.sequenceParam] : undefined;

        if (!config.sceneName) return;

        this.layout = this.buildLayout(config.sceneName);
        this.spines = (config.spineNames || [])
            .map((name) => this.layout.find(name))
            .filter(Boolean);

        this.texts = [];

        for (const valueDef of config.values || []) {
            if (valueDef.label) {
                const texts = this.findAll(valueDef.label);

                for (const text of texts) {
                    const value = options[valueDef.param] ?? valueDef.defaultValue ?? "";
                    text.text = String(value);
                }
            } else {
                const text = this._createSlotText({
                    spineName: valueDef.spine,
                    slotName: valueDef.slot,
                    value: options[valueDef.param] ?? valueDef.defaultValue ?? "",
                    style: valueDef.style,
                });

                if (text) this.texts.push(text);
            }
        }

        if (config.counter) {
            this.setupCounter(config.counter, options);
        }
    }

    destroy(options) {
        this.timeline?.kill();
        this.timeline = null;

        if (this.winCounter) {
            gsap.killTweensOf(this.winCounter);
            this.winCounter = null;
        }

        this._stopSpineSequence();

        if (this.texts) {
            for (const text of this.texts) {
                if (text.destroyed) continue;
                text.parent?.removeSlotObject?.(text);
                text.destroy();
            }
            this.texts = [];
        }

        super.destroy(options);
    }

    _createSlotText({ spineName, slotName, value, style }) {
        const spineWrapper = spineName ? this.layout.find(spineName) : this.spines[0];
        if (!spineWrapper) return null;

        const text = this.factory.buildDisplayObject("Text", {
            text: String(value),
            style: style || "WinPopupCounterStyle",
        });
        text.anchor.set(0.5);

        const spine = spineWrapper.spineObject;
        spine.cacheAsTexture(false);
        spine.autoUpdate = true;
        spine.addSlotObject(slotName, text);

        return text;
    }

    setupCounter(counterConfig, options) {
        const { spineName, slotNames = [], style = "WinPopupCounterStyle", duration = 1, sfx = {}, param } = counterConfig;
        this.counterConfig = { duration, sfx, param };
        this.winValue = options[param] ?? 0;

        for (const slotName of slotNames) {
            const text = this._createSlotText({ spineName, slotName, value: 0, style });
            if (text) this.texts.push(text);
        }
    }

    show() {
        super.show();

        this.visible = true;
        this.alpha = 0;

        const sequence = this._resolveSequence();
        const stepDurations = sequence.map((step) => this._stepDuration(step));
        const totalSpine = stepDurations.reduce((a, b) => a + b, 0);

        this.timeline = gsap.timeline({ onComplete: () => this._finishShow() });

        this.timeline.fadeCurrentMusic(0.5, 0.25);

        const seqStart = 0;

        this.timeline.to(this, { duration: 0.005, alpha: 1 }, seqStart);
        this.timeline.call(() => this._startSpineSequence(sequence), null, seqStart);

        let cursor = 0;
        for (let i = 0; i < sequence.length; i++) {
            const step = sequence[i];
            const startAt = seqStart + cursor;
            const endAt = startAt + stepDurations[i];

            if (i === sequence.length - 1) {
                this.timeline.addLabel("lastAnimationStart", startAt);
            }
            if (step.sfx?.name) {
                this.timeline.playSfx(step.sfx.name, step.sfx, startAt);
                this.timeline.stopSfx(step.sfx.name, endAt);
            }
            cursor += stepDurations[i];
        }

        if (sequence.length === 0) {
            this.timeline.addLabel("lastAnimationStart", seqStart);
        }

        if (totalSpine > 0) {
            this.timeline.to({}, { duration: totalSpine }, seqStart);
        }

        const counterTween = this._buildCounterTween();
        if (counterTween) this.timeline.add(counterTween, seqStart);

        this.timeline.addLabel("skipTime");
        this.timeline.call(() => this._stopSpineSequence());

        this.timeline.to(this, { duration: 0.05, alpha: 0 }, "-=0.1");
        this.timeline.fadeCurrentMusic(1, 0.25);

        return this.timeline;
    }

    _resolveSequence() {
        const config = this.popupConfig;
        return (this.sequenceLevel && config.sequences?.[this.sequenceLevel]) || config.sequence || [];
    }

    _stepDuration(step) {
        const timeScale = this.popupConfig.animationTimeScale ?? 1;
        const data = this.spines?.[0]?.spineObject?.skeleton?.data;
        const anim = data?.findAnimation(step.animation);
        if (!anim) return 0;
        const loops = Math.max(1, step.loop || 1);
        return (anim.duration * loops) / timeScale;
    }

    _startSpineSequence(sequence) {
        if (!sequence.length || !this.spines) return;
        const timeScale = this.popupConfig.animationTimeScale ?? 1;

        for (const spine of this.spines) {
            const state = spine.spineObject?.state;
            if (!state) continue;
            spine.autoUpdate = true;

            let isFirst = true;
            for (const step of sequence) {
                const loops = Math.max(1, step.loop || 1);
                for (let r = 0; r < loops; r++) {
                    const entry = isFirst
                        ? state.setAnimation(0, step.animation, false)
                        : state.addAnimation(0, step.animation, false, 0);
                    if (entry) entry.timeScale = timeScale;
                    isFirst = false;
                }
            }
        }
    }

    _stopSpineSequence() {
        if (!this.spines) return;
        for (const spine of this.spines) {
            spine.spineObject?.state?.clearTrack(0);
        }
    }

    _finishShow() {
        this.visible = false;
        this._stopSpineSequence();
        this.onComplete.emit();
    }

    _buildCounterTween() {
        if (!this.counterConfig || !this.texts.length) return null;

        const { duration, sfx } = this.counterConfig;
        if (!this.winValue || !duration) return null;

        const fmt = this.services.get("currencyFormatter");
        this.winCounter = new WinValueCounter({
            value: 0,
            duration,
            text: this.texts,
            format: fmt.format.bind(fmt),
        });
        this.winCounter.setWin(0);

        const timeline = gsap.timeline();
        if (sfx?.counterLoop) {
            timeline.playSfx(sfx.counterLoop, { loop: true });
        }
        timeline.add(this.winCounter.countTo(this.winValue));
        if (sfx?.counterLoop) {
            timeline.stopSfx(sfx.counterLoop);
        }
        if (sfx?.counterEnd) {
            timeline.playSfx(sfx.counterEnd);
        }

        return timeline;
    }
}
