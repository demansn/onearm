import { Container } from "pixi.js";
import { BaseContainer } from "../../common/core/BaseContainer.js";
import { Signal } from "typed-signals";

export class Scene extends BaseContainer {
    constructor({ name, layer, services, ...options } = {}) {
        super();

        this.services = services;
        this.label = name || this.constructor.name;
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
     * Build layout for the scene.
     * Configs with `modes` automatically create a ScreenLayout.
     * @param {string|Object} layout - Layout name or config
     * @param {Object} [properties] - Additional properties
     * @returns {Object} Built layout object
     */
    buildLayout(layout, properties = {}) {
        const displayObject = this.layouts.build(layout, properties);
        this.addChild(displayObject);
        return displayObject;
    }

    create(options) {}

    show() {
        this.visible = true;
        this._forEachSpine(this, (spine) => {
            if (spine.autoPlay) spine.play(spine.loop ?? true);
        });
    }

    hide() {
        this._forEachSpine(this, (spine) => {
            spine.stop();
        });
        this.visible = false;
    }

    _forEachSpine(node, fn) {
        if ('autoPlay' in node && node !== this) {
            fn(node);
        }
        if (node.children) {
            for (const child of node.children) {
                this._forEachSpine(child, fn);
            }
        }
    }

    getPressSignal(query) {
        const button = this.layout.get(query);

        if (!button || !button.onPress) {
            console.error('Button not found or has no onPress signal:', query);

            if (!this.signals[query]) {
                this.signals[query] = new Signal();
            }

            return this.signals[query]
        }

        return button.onPress;
    }

    /**
     * Create a mount point that follows a named placeholder across layout variants.
     * Returns a Container that is automatically reparented into the placeholder
     * of the current ScreenLayout variant whenever the layout changes.
     *
     * Used by SceneManager to mount child scenes declared in the `children` config.
     *
     * @param {string} placeholderName - Name of the placeholder object in the layout
     * @returns {Container} Mount container (add child scene content here)
     */
    mountInPlaceholder(placeholderName) {
        const mount = new Container();
        const reparent = () => {
            const ph = this.layout.findInCurrentLayout?.(placeholderName)
                || this.layout.find?.(placeholderName);
            if (ph) ph.addChild(mount);
        };
        reparent();
        if (this.layout?.onLayoutChange) {
            this.layout.onLayoutChange.connect(reparent);
        }
        return mount;
    }

    findBehavior(query) {
        const container = this.layout?.find?.(query) || this.find(query);
        return container?.behavior || null;
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
