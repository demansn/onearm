import { services } from "../../ServiceLocator.js";
import { SuperContainer } from "../../common/displayObjects/SuperContainer.js";
import { Signal } from "typed-signals";

export class Scene extends SuperContainer {
    constructor({ name, layer, ...options } = {}) {
        super();

        this.name = name || this.constructor.name;
        this.visible = false;
        if (layer) {
            this.parentLayer = services.get("layers").get(layer);
        }
        this.currencyFormatter = services.get("currencyFormatter");
        this.layouts = services.get("layouts");
        this.signals = {};

        if (this.layouts.getConfig(name)) {
            this.layout = this.buildLayout(name);
        }

        this.create(options);
    }

    /**
     * Build layout for the scene. Uses ScreenLayout if multiple variants exist.
     * @param {string|Object} layout - Layout name or config
     * @param {Object} [properties] - Additional properties
     * @returns {Object} Built layout object
     */
    buildLayout(layout, properties = {}) {
        let displayObject;

        if (this.layouts.hasMultipleVariants(layout)) {
            displayObject = this.layouts.buildScreenLayout(layout);
        } else {
            displayObject = this.layouts.build(layout, properties);
        }

        this.addChild(displayObject);

        return displayObject;
    }

    create(options) {}

    show() {
        this.visible = true;
    }

    hide() {
        this.visible = false;
    }

    getPressSignal(query) {
        const button = this.layout.get(query);

        if (!button || !button.onPress) {
            console.error('Button not found or has no onPress signal:', query);

            if (!this.signals[query]) {
                this.signals[query] = new Signal();
            }

            return new this.signals[query]
        }

        return button.onPress;
    }

    getObject(query) {
        const toggle = this.layout.find(query);

        if (!toggle) {
            console.error('Toggle not found:', query);
            return { onChange: new Signal(), onPress: new Signal };
        }

        return toggle;
    }
}
