import { FancyButton } from "@pixi/ui";

import services from "../../ServiceLocator.js";

/**
 * @param {string} template
 * @param {string} state
 * @returns {string}
 */
const templateToName = (template, state) => template.replace("[ButtonState]", state);

export const ButtonState = {
    DEFAULT: "default",
    HOVER: "hover",
    PRESSED: "pressed",
    DISABLED: "disabled",
};

const getResources = name => {
    return services.get("resources").get(name) ? name : undefined;
};

export class Button extends FancyButton {
    constructor({ name, template, onClick, ...options }) {
        super({
            defaultView: getResources(
                name ? `${name}_btn_default` : templateToName(template, ButtonState.DEFAULT),
            ),
            hoverView: getResources(
                name ? `${name}_btn_hover` : templateToName(template, ButtonState.HOVER),
            ),
            pressedView: getResources(
                name ? `${name}_btn_pressed` : templateToName(template, ButtonState.PRESSED),
            ),
            disabledView: getResources(
                name ? `${name}_btn_disabled` : templateToName(template, ButtonState.DISABLED),
            ),
            ...options,
        });

        this.onPress.connect(this.onPressed.bind(this));
        this.onHover.connect(this.onHovered.bind(this));

        if (onClick) {
            this.on("clicked", onClick);
        }
    }

    onPressed() {
        services.audio.playSfx("Click_2");
        this.emit("clicked");
    }

    onHovered() {
        services.audio.playSfx("Hover");
    }
}
