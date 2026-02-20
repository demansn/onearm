import { CheckBox } from "@pixi/ui";

import { BaseContainer } from "../core/BaseContainer.js";
import { services } from "../../ServiceLocator.js";
import { DARK_GRAY, DARK_GRAY_HEIGHT } from "../../constants/colors.js";


export class CheckBoxComponent extends BaseContainer {
    constructor({ checked, unchecked, value = false }) {
        super();
        this.checkBox = this.createObject(CheckBox, {
            params: {
                style: { unchecked, checked },
            },
        });
        this.checkBox.forceCheck(value);
        this.checkBox.onCheck.connect(this.handleChange.bind(this));
    }

    handleChange() {
        services.get("audio").playSfx("button_click");
    }

    setState(value) {
        this.checkBox.forceCheck(value);
    }

    get onChange() {
        return this.checkBox.onCheck;
    }

    get enabled() {
        return this.btn.enabled;
    }

    set enabled(enabled) {
        if (enabled) {
            this.restoreTint();
            this.checkBox.alpha = 1;
        } else {
            this.setTint(DARK_GRAY_HEIGHT);
            this.checkBox.alpha = 0.7;
        }
        this.checkBox.eventMode = enabled ? 'static' : 'none';
        this.checkBox.cursor = enabled ? 'pointer' : 'default';
        this.checkBox.interactiveChildren = enabled;
        this.checkBox.enabled = enabled;
    }
}
