import { FancyButton } from "@pixi/ui";
import { BaseContainer } from "../core/BaseContainer.js";
import services from "../../ServiceLocator.js";
import { DARK_GRAY_HEIGHT } from "../../constants/colors.js";

/**
 * Unified Button component.
 * Replaces Button, AnimationButton, and ButtonWithTitle with a single configurable class.
 *
 * @example Texture-based button (4 state textures):
 * new Button({ name: "spin" });
 * // Looks up: spin_btn_default, spin_btn_hover, spin_btn_pressed, spin_btn_disabled
 *
 * @example Template-based button:
 * new Button({ template: "btn_[state]_bg" });
 *
 * @example Single image with scale animation:
 * new Button({
 *     image: "btn_spin",
 *     animation: { hover: 1.03, press: 0.95 },
 *     sounds: { press: "button_click", hover: "button_hover" },
 * });
 *
 * @example Button with text label:
 * new Button({
 *     name: "action",
 *     text: "PLAY",
 *     textStyle: "ButtonLabel",
 * });
 *
 * @example Button with explicit views:
 * new Button({
 *     views: { defaultView: sprite1, hoverView: sprite2 },
 * });
 */
export class Button extends BaseContainer {
    #btn;
    #sounds;
    #disabledStyle;

    constructor({
        // View mode: name-based (4 textures)
        name,
        // View mode: template-based (4 textures with pattern)
        template,
        // View mode: single image (use with animation)
        image,
        // View mode: explicit FancyButton view objects
        views,

        // Text label (optional)
        text,
        textStyle,

        // Scale animation on hover/press (optional)
        animation = null,

        // Sound effects
        sounds = { press: "Click_2", hover: "Hover" },

        // Disabled visual style
        disabledStyle = { tint: DARK_GRAY_HEIGHT, alpha: 0.7 },

        // Click handler
        onClick,

        // FancyButton anchor
        anchor,

        // Initial disabled state
        disabled = false,
    } = {}) {
        super();
        this.label = name || "Button";
        this.#sounds = sounds;
        this.#disabledStyle = disabledStyle;

        const btnConfig = {};

        // --- Resolve views ---
        if (views) {
            Object.assign(btnConfig, views);
        } else if (name && !image && !template) {
            const res = n => services.get("resources").get(n) ? n : undefined;
            btnConfig.defaultView = res(`${name}_btn_default`);
            btnConfig.hoverView = res(`${name}_btn_hover`);
            btnConfig.pressedView = res(`${name}_btn_pressed`);
            btnConfig.disabledView = res(`${name}_btn_disabled`);
        } else if (template) {
            const res = n => services.get("resources").get(n) ? n : undefined;
            btnConfig.defaultView = res(template.replace("[state]", "default").replace("[ButtonState]", "default"));
            btnConfig.hoverView = res(template.replace("[state]", "hover").replace("[ButtonState]", "hover"));
            btnConfig.pressedView = res(template.replace("[state]", "pressed").replace("[ButtonState]", "pressed"));
            btnConfig.disabledView = res(template.replace("[state]", "disabled").replace("[ButtonState]", "disabled"));
        } else if (image) {
            btnConfig.defaultView = image;
        }

        // --- Animation ---
        if (animation) {
            btnConfig.animations = {
                hover: {
                    props: { scale: { x: animation.hover || 1.03, y: animation.hover || 1.03 } },
                    duration: animation.duration || 0.5,
                },
                pressed: {
                    props: { scale: { x: animation.press || 0.95, y: animation.press || 0.95 } },
                    duration: animation.duration || 0.5,
                },
            };
        }

        // --- Text ---
        if (text) {
            btnConfig.text = text;
            btnConfig.defaultTextAnchor = { x: 0.5, y: 0.5 };
            if (textStyle) {
                btnConfig.textStyle = typeof textStyle === "string"
                    ? this.factory.getStyle(textStyle)
                    : textStyle;
            }
        }

        // --- Anchor ---
        if (anchor !== undefined) {
            btnConfig.anchor = anchor;
        }

        this.#btn = new FancyButton(btnConfig);
        this.addChild(this.#btn);

        // --- Events ---
        this.#btn.onPress.connect(() => {
            if (this.#sounds?.press) {
                services.get("audio").playSfx(this.#sounds.press);
            }
            this.emit("clicked");
        });

        this.#btn.onHover.connect(() => {
            if (this.#sounds?.hover) {
                services.get("audio").playSfx(this.#sounds.hover);
            }
        });

        if (onClick) {
            this.on("clicked", onClick);
        }

        if (disabled) {
            this.enabled = false;
        }
    }

    get onPress() {
        return this.#btn.onPress;
    }

    get onHover() {
        return this.#btn.onHover;
    }

    get enabled() {
        return this.#btn.enabled;
    }

    set enabled(value) {
        this.#btn.enabled = value;
        if (value) {
            this.restoreTint();
            this.#btn.alpha = 1;
        } else {
            if (this.#disabledStyle.tint) {
                this.setTint(this.#disabledStyle.tint);
            }
            this.#btn.alpha = this.#disabledStyle.alpha ?? 0.7;
        }
    }

    setText(text) {
        if (this.#btn.textView) {
            this.#btn.textView.text = text;
        }
    }

    get fancyButton() {
        return this.#btn;
    }
}
