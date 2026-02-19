import { FancyButton } from "@pixi/ui";
import { SuperContainer } from "../displayObjects/SuperContainer.js";
import services from "../../ServiceLocator.js";
import { DARK_GRAY, DARK_GRAY_HEIGHT } from "../../constants/colors.js";

export class AnimationButton extends SuperContainer {
    constructor({
        name = "AnimationButton",
        image,
        label = "",
        labelStyle = "",
        sfx = { press: "button_click", hover: "button_hover" },
    } = {}) {
        super();
        this.label = name;

        const buttonOptions = {
            defaultView: image,
            animations: {
                hover: {
                    props: {
                        scale: { x: 1.03, y: 1.03 },
                    },
                    duration: 0.5,
                },
                pressed: {
                    props: {
                        scale: { x: 0.95, y: 0.95 },
                    },
                    duration: 0.5,
                },
            },
        };

        if (label) {
            buttonOptions.text = label;
            buttonOptions.defaultTextAnchor = { x: 0.5, y: 0.5 };
            if (labelStyle) {
                buttonOptions.textStyle = this.mather.getStyle(labelStyle);
            }
        }

        this.sfx = sfx;
        this.btn = new FancyButton(buttonOptions);
        this.btn.anchor.set(0.5, 0.5);
        this.btn.x += this.btn.width / 2;
        this.btn.y += this.btn.height / 2;
        this.addChild(this.btn);

        this.btn.onPress.connect(this.handlePress.bind(this));
        this.btn.onHover.connect(this.handleHover.bind(this));
    }

    handlePress() {
        if (this.sfx.press) {
            services.get("audio").playSfx(this.sfx.press);
        }
    }

    handleHover() {
        if (this.sfx.hover) {
            services.get("audio").playSfx(this.sfx.hover);
        }
    }

    get enabled() {
        return this.btn.enabled;
    }

    set enabled(enabled) {
        if (enabled) {
            this.restoreTint();
            this.btn.alpha = 1;
        } else {
            this.setTint(DARK_GRAY_HEIGHT);
            this.btn.alpha = 0.7;
        }
        this.btn.enabled = enabled;
    }

    get onPress() {
        return this.btn.onPress;
    }
}
