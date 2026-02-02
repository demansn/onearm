import { Signal } from "typed-signals";
import { gsap } from "gsap";

export const SpinSpeedTypes = {
    NORMAL: "NORMAL",
    QUICK: "QUICK",
    TURBO: "TURBO",
}

export const SpinSpeedButtons = {
    NORMAL: "NormalSpinButton",
    QUICK: "QuickSpinButton",
    TURBO: "TurboSpinButton",
}

export const SpinSpeedInfo = {
    NORMAL: "NormalSpin",
    QUICK: "QuickSpin",
    TURBO: "TurboSpin",
}

export class SpinSpeedHUDContolls {
    constructor(root, {type}) {

        this._type = type;
        this.onChange = new Signal();

        this.root = root;

        this.root.forAll(SpinSpeedButtons.TURBO, (button) => {
            button.onPress.connect(() => this.handleChange(SpinSpeedTypes.NORMAL));
        });
        this.root.forAll(SpinSpeedButtons.QUICK, (button) => {
            button.onPress.connect(() => this.handleChange(SpinSpeedTypes.TURBO));
        });
        this.root.forAll(SpinSpeedButtons.NORMAL, (button) => {
            button.onPress.connect(() => this.handleChange(SpinSpeedTypes.QUICK));
        });

        this.setVisibleButtonByType(type);
        this.updateSpinSpeedInfoPopup(type);

        this.root.findAll("SpinSpeedInfo").forEach(popup => {
            popup.visible = false;
            popup.alpha = 0;
        });
    }
    set type(value) {
        if (this._type === value) {
            return;
        }
        this._type = value;
        this.setVisibleButtonByType(value);
    }

    get type() {
        return this._type;
    }

    handleChange(type) {
        this._type = type;
        this.setVisibleButtonByType(type);
        this.updateSpinSpeedInfoPopup(type);
        this.showSpinSpeedInfoPopup();
        this.onChange.emit(type);
    }

    setVisibleButtonByType(type) {
        Object.values(SpinSpeedButtons).forEach(button => {
            this.root.forAll(button, (obj) => obj.visible = false);
        });
        this.root.forAll(SpinSpeedButtons[type], (obj) => obj.visible = true);
    }

    set enabled(value) {
        Object.values(SpinSpeedButtons).forEach(button => {
            this.root.forAll(button, (obj) => obj.enabled = value);
        });
    }

    updateSpinSpeedInfoPopup(type) {
        for (const key in SpinSpeedInfo) {
            this.root.forAll(`SpinSpeedInfo.${SpinSpeedInfo[key]}`, (obj) => {
                obj.visible = key === type;
            });
        }
    }

    showSpinSpeedInfoPopup() {
        const popups = this.root.findAll("SpinSpeedInfo");

        if (popups.length === 0) {
            return;
        }

        const tl = gsap.timeline();

        gsap.killTweensOf(popups);

        tl.set(popups, { visible: true});
        tl.to(popups, {
            alpha: 1,
            duration: 0.25,
            ease: "power2.inOut",
        });
        tl.to(popups, {
            alpha: 0,
            duration: 0.25,
            ease: "power2.inOut",
        }, 1);
        tl.set(popups, { visible: false });
    }
}
