import { FancyButton } from "@pixi/ui";

import { SuperContainer } from "../displayObjects/SuperContainer";
import services from "../../ServiceLocator.js";

export class ButtonWithTitle extends SuperContainer {
    /**
     * @type {FancyButton}
     */
    #view = null;
    constructor({ title, onClick, disabled }) {
        super();

        this.#view = this.addObject(FancyButton, {
            defaultView: new ButtonState({ state: "Default", title }),
            hoverView: new ButtonState({ state: "Hover", title }),
            pressedView: new ButtonState({ state: "Pressed", title }),
            disabledView: new ButtonState({ state: "Disabled", title }),
            anchor: 0.5,
        });

        this.#view.onPress.connect(() => {
            this.emit("clicked");
        });

        if (onClick) {
            this.on("clicked", onClick);
        }

        if (disabled) {
            this.enabled = false;
        }

        this.#view.onHover.connect(this.onHover.bind(this));
        this.#view.onPress.connect(this.onPressed.bind(this));
    }

    onHover() {
        services.audio.playSfx("Hover");
    }

    onPressed() {
        services.audio.playSfx("Click_2");
    }

    set enabled(value) {
        this.#view.enabled = value;
    }

    get enabled() {
        return this.#view.enabled;
    }

    setState(state) {
        this.#view.setState(state);
    }

    setTitle(title) {
        this.#view.defaultView.title = title;
        this.#view.hoverView.title = title;
        this.#view.pressedView.title = title;
        this.#view.disabledView.title = title;
    }
}

class ButtonState extends SuperContainer {
    constructor({ title, state }) {
        super();

        const bg = this.addObject(`buttonWithText${state}`, {});
        this.text = this.addObject(
            "Text",
            { text: title, style: `ButtonWithTitle${state}` },
            { x: bg.width / 2 - 6, y: bg.height / 2 - 6, anchor: 0.5 },
        );

        if (state === "Disabled" || state === "Pressed") {
            this.text.alpha = 0.5;
        }
    }

    set title(value) {
        this.text.text = value;
    }
}
