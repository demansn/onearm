import { Signal } from "typed-signals";
import { SuperContainer } from "../displayObjects/SuperContainer";
import { CustomSlider } from "./CustomSlider";

export class SoundVolumeController extends SuperContainer {
    constructor(container, { volume = 100, muted = false } = {}) {
        super();

        this.container = container;
        this._volume = volume;
        this._muted = muted;

        this.onVolumeChange = new Signal();
        this.onMutedChange = new Signal();

        this.initElements();
        this.initSlider();
        this.updateUI();
    }

    initElements() {
        this.sliderBG = this.container.find("SliderBG");
        this.sliderFill = this.container.find("SliderFill");
        this.sliderBtn = this.container.find("SliderBtn");
        this.volumeText = this.container.find("SoundVolumeText");
        this.iconsContainer = this.container.find("Icons");

        this.icons = {
            0: this.iconsContainer?.find("0"),
            10: this.iconsContainer?.find("10"),
            25: this.iconsContainer?.find("25"),
            50: this.iconsContainer?.find("50"),
            100: this.iconsContainer?.find("100"),
        };

    }

    initSlider() {
        this.slider = new CustomSlider({
            bg: this.sliderBG,
            fill: this.sliderFill,
            slider: this.sliderBtn,
            min: 0,
            max: 100,
            step: 1,
            value: this._volume,
        });

        this.container.addChild(this.slider);

        this.slider.onUpdate.connect(this.handleSliderUpdate.bind(this));
    }

    handleSliderUpdate(value) {
        const roundedValue = Math.round(value);

        if (this._volume !== roundedValue) {
            this._volume = roundedValue;

            if (this._volume === 0) {
                if (!this._muted) {
                    this._muted = true;
                    this.onMutedChange.emit(true);
                }
            } else {
                if (this._muted) {
                    this._muted = false;
                    this.onMutedChange.emit(false);
                }
            }

            this.updateUI();
            this.onVolumeChange.emit(this._volume);
        }
    }

    updateMutedState(muted) {
        if (this._muted !== muted) {
            this._muted = muted;
            this.updateUI();
        }
    }

    setVolume(value) {
        const roundedValue = Math.round(value);
        if (this._volume !== roundedValue) {
            this._volume = roundedValue;
            this.slider.value = roundedValue;
            this.updateUI();
        }
    }

    updateUI() {
        this.updateVolumeText();
        this.updateColors();
        this.updateIcons();
    }

    updateVolumeText() {
        if (this.volumeText) {
            this.volumeText.text = this._volume.toString();
        }
    }

    updateColors() {
        const color = this._muted ? 0xff0000 : 0x439600;

        if (this.sliderFill) {
            this.sliderFill.color = color;
        }

        if (this.sliderBtn) {
            this.sliderBtn.color = color;
        }
    }

    updateIcons() {
        if (!this.icons) return;

        Object.values(this.icons).forEach(icon => {
            if (icon) icon.visible = false;
        });

        let activeIcon;

        if (this._muted || this._volume === 0) {
            activeIcon = this.icons[0];
        } else if (this._volume <= 10 && this.icons[10]) {
            activeIcon = this.icons[10];
        } else if (this._volume <= 25 && this.icons[25]) {
            activeIcon = this.icons[25];
        } else if (this._volume <= 50 && this.icons[50]) {
            activeIcon = this.icons[50];
        } else {
            activeIcon = this.icons[100];
        }

        if (activeIcon) {
            activeIcon.visible = true;
        }
    }

    get volume() {
        return this._volume;
    }

    get muted() {
        return this._muted;
    }
}

