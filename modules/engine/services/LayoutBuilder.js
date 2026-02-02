import { Mather } from "../common/displayObjects/Mather.js";
import { ScreenLayout } from "../common/displayObjects/ScreenLayout.js";
import { Service } from "./Service.js";
import { ValueSlider } from "../common/UI/ValueSlider.js";

export class LayoutBuilder extends Service {
    constructor(params) {
        super(params);

        const { services } = params;

        this.textures = services.get("resources");
        this.styles = services.get("styles");
        this.layers = services.get("layers");
        this.resizeSystem = services.get("resizeSystem");
        this.layoutSystem = services.get("layoutSystem");
        this.componentsConfig = this.textures.get("components.config");

        this.mather = new Mather({}, this.textures, this.styles, this.layers,  this.resizeSystem.getContext().zone);
    }

    getConfig(name) {
        return this.componentsConfig.components.find(component => component.name === name);
    }

    get variantByMode() {
        return this.resizeSystem.getContext().mode;
    }

    build(layout) {
        const variant = this.variantByMode;
        const layoutConfig = typeof layout === "string" ? this.getLayoutConfig(layout) : layout;
        const displayObject = this.buildLayout(layoutConfig, { isRoot: true, variant });

        if (displayObject.onScreenResize && typeof displayObject.onScreenResize === "function") {
            displayObject.onScreenResize(this.resizeSystem.getContext());
        }

        return displayObject;
    }

    buildLayout(config, properties = { isRoot: false, variant: "default" }) {
        const variant = properties.variant || "default";
        const variantConfig = config.variants
            ? config.variants[variant] || config.variants.default || {}
            : config;
        const { type, name } = config;
        const { children = [], ...configProperties } = variantConfig;
        let displayObject;

        switch (type) {
            case "ComponentContainer":
                displayObject = this.buildDisplayObject(type, {
                    name,
                    isRoot: properties.isRoot,
                    variants: config.variants,
                    ...configProperties,
                });

                if (children && children.length > 0) {
                    displayObject.addChild(...this.buildLayoutChildren(children));
                }

                if (displayObject.layout && typeof displayObject.layout === "function") {
                    displayObject.layout();
                }
                if (
                    displayObject.updateLayout &&
                    typeof displayObject.updateLayout === "function"
                ) {
                    displayObject.updateLayout();
                }

                break;
            case "AnimationButton":
                displayObject = this.buildAnimationButtonLayout({ type, name, ...variantConfig });
                break;
            case "CheckBoxComponent":
                displayObject = this.buildCheckBoxComponentLayout({ type, name, ...variantConfig });
                break;
            case "ValueSlider":
                displayObject = this.buildValueSliderLayout({ type, name, ...variantConfig });
                break;
            case "DotsGroup":
                displayObject = this.buildDotsGroupLayout({ type, name, ...variantConfig });
                break;
            case "ProgressBar":
                displayObject = this.buildProgressBarLayout({ type, name, ...variantConfig });
                break;
            case "ScrollBox":
                displayObject = this.buildScrollBoxComponentLayout({ type, name, ...variantConfig });
                break;
            case "VariantsContainer":
                displayObject = this.buildVariantsContainerLayout({ type, name, ...config, variant: properties.variant });
                break;
            case "ZoneContainer":
            case "FullScreenZone":
            case "SaveZone":
                displayObject = this.buildZoneContainerLayout({ type, name, ...config, variant: properties.variant });
                break;
            default:
                displayObject = this.buildDisplayObject(type, { name, ...variantConfig });
                break;
        }

        this.applyProperties(displayObject, configProperties);

        return displayObject;
    }

    buildVariantsContainerLayout(config) {
        const { name, type, variants, variant, ...configProperties } = config;
        const variantsView = [];

        for (let name in variants) {
            const variant = variants[name];
            const children = variant.children ? variant.children.map(child => this.buildLayoutChild(child)) : [];
            variantsView.push({ name, children });
        }

        const options = {
            name,
            variants: variantsView,
            variant: variant,
        };

        return this.buildDisplayObject(type, options);
    }

    buildScrollBoxComponentLayout(config) {
        const { name, type, children, scrollType, ...configProperties } = config;
        const displayObject = this.buildDisplayObject("ScrollBoxComponent", {
            name,
            scrollType,
            ...configProperties,
        });

        if (children && children.length > 0) {
            const builtChildren = this.buildLayoutChildren(children);
            builtChildren.forEach(child => displayObject.addItem(child));
        }

        return displayObject;
    }

    buildProgressBarLayout(config) {
        const { name, type, bg, fill, progress = 0, ...configProperties } = config;
        const options = {
            name,
            progress,
            ...configProperties,
        };

        if (bg) {
            options.bg = this.buildLayoutChild(bg);
        }

        if (fill) {
            options.fill = this.buildLayoutChild(fill);
        }

        return this.buildDisplayObject(type, options);
    }

    buildDotsGroupLayout(config) {
        const { name, type, size = 1, on, off, gap = 0 } = config;
        const options = {
            name,
            on: () => this.buildLayoutChild(on),
            off: () => this.buildLayoutChild(off),
            size,
            elementsMargin: gap,
        };

        return this.buildDisplayObject(type, options);
    }


    buildLayoutChildren(configs) {
        const displayObjects = [];

        configs.forEach(config => {
            const { name, variant, children, isInstance, ...objectProperties } = config;
            let child;

            if (config.isInstance) {
                const layoutConfig =
                    this.getLayoutConfig(config.type) || this.getLayoutConfig(config.name);

                    if (layoutConfig) {
                        child = this.buildLayout(layoutConfig, { name, variant: config.variant });
                    } else {
                        const type = this.mather.getObjectFactory(config.name) ? config.name : config.type;

                        child = this.buildDisplayObject(type, { name, ...objectProperties });
                    }

                child.name = name;
            } else if (config.type === "AnimationButton") {
                child = this.buildAnimationButtonLayout(config);
            } else if (config.type === "CheckBoxComponent") {
                child = this.buildCheckBoxComponentLayout(config);
            } else if (config.type === "ValueSlider") {
                child = this.buildValueSliderLayout(config);
            } else if (config.type === "VariantsContainer") {
                child = this.buildVariantsContainerLayout(config);
            } else if (config.type === "DotsGroup") {
                child = this.buildDotsGroupLayout(config);
            } else if (config.type === "ProgressBar") {
                child = this.buildProgressBarLayout(config);
            } else if (config.type === "ScrollBox") {
                child = this.buildScrollBoxComponentLayout(config);
            } else if (config.type === "ZoneContainer" || config.type === "FullScreenZone" || config.type === "SaveZone") {
                child = this.buildZoneContainerLayout(config);
            } else {
                child = this.buildLayoutChild(config);
            }

            this.applyProperties(child, objectProperties);
            displayObjects.push(child);

            if (child.layout && typeof child.layout === "function") {
                child.layout();
            }
            if (child.updateLayout && typeof child.updateLayout === "function") {
                child.updateLayout();
            }
        });

        return displayObjects;
    }

    buildLayoutChild(config) {
        const { name, variant, type, children, isInstance, ...configProperties } = config;
        const child = this.buildDisplayObject(type, { name, ...configProperties });

        this.applyProperties(child, configProperties);

        if (children && children.length > 0) {
            child.addChild(...this.buildLayoutChildren(children));
        }

        return child;
    }

    buildZoneContainerLayout(config) {
        const { name, type, children, isInstance, ...configProperties } = config;
        const displayObject = this.buildDisplayObject(type, { name, ...configProperties });
        displayObject.name = name;

        if (children && children.length > 0) {
            displayObject.addChild(...this.buildLayoutChildren(children));
        }

        children.forEach(config => {
            const child = displayObject.children.find(child => child.name === config.name);
            const { name, variant, children, isInstance, ...objectProperties } = config;

            if (child) {
                 child.displayConfig = objectProperties;
                 this.applyProperties(child, objectProperties);
                 this.layoutSystem?.updateObject(child);

                 if (child.layout && typeof child.layout === "function") {
                    child.layout();
                }
                if (child.updateLayout && typeof child.updateLayout === "function") {
                    child.updateLayout();
                }
            }
        });

        return displayObject;
    }

    buildAnimationButtonLayout(config) {
        const { name, type, variant, children, isInstance, ...configProperties } = config;
        const image = this.buildLayoutChild(children[0]);

        return this.buildDisplayObject(type, { name, image, ...configProperties });
    }

    buildCheckBoxComponentLayout(config) {
        const { name, type, states, state = "off", isInstance, ...configProperties } = config;

        const checked = this.buildLayoutChild(states.on);
        const unchecked = this.buildLayoutChild(states.off);

        return this.buildDisplayObject(type, {
            name,
            value: state === "on",
            checked,
            unchecked,
            ...configProperties,
        });
    }

    buildValueSliderLayout(config) {
        const { name, type, children, isInstance, ...configProperties } = config;
        const displayObject = new ValueSlider();
        displayObject.name = name;

        if (children && children.length > 0) {
            displayObject.addChild(...this.buildLayoutChildren(children));
        }

        displayObject.init();

        return displayObject;
    }

    applyProperties(displayObject, properties) {
        const possibleKeys = [
            "x",
            "y",
            "width",
            "height",
            "alpha",
            "visible",
            "name",
            "anchorX",
            "anchorY",
            "scale",
            "colorStops",
            "gradientType",
            "gradientAngle",
            "gradientCenter",
            "gradientRadius",
        ];

        for (const key in properties) {
            if (possibleKeys.includes(key)) {
                if (key === "scale") {
                    if (typeof properties[key] === "number") {
                        displayObject.scale.set(properties[key]);
                    } else {
                        displayObject.scale.x = properties[key].x;
                        displayObject.scale.y = properties[key].y;
                    }
                } else if (displayObject[key] !== undefined) {
                    displayObject[key] = properties[key];
                } else {
                    if (key === "anchorX" && displayObject.anchor) {
                        displayObject.anchor.x = properties[key];
                    } else if (key === "anchorY" && displayObject.anchor) {
                        displayObject.anchor.y = properties[key];
                    }
                }
            }
        }
    }

    getLayoutConfig(name) {
        return this.componentsConfig.components.find(component => component.name === name);
    }

    hasLayoutConfig(name) {
        return this.getLayoutConfig(name) !== undefined;
    }

    buildDisplayObject(name, properties = {}) {
        if (name === "Component") {
            return this.mather.buildDisplayObject(properties.name, properties);
        }

        return this.mather.buildDisplayObject(name, properties);
    }

    /**
     * Build a ScreenLayout that manages multiple layout trees for different modes
     * @param {string|Object} layout - Layout name or config
     * @returns {ScreenLayout}
     */
    buildScreenLayout(layout) {
        const layoutConfig = typeof layout === "string" ? this.getLayoutConfig(layout) : layout;

        if (!layoutConfig || !layoutConfig.variants) {
            throw new Error(`ScreenLayout requires a config with variants: ${layout}`);
        }

        const screenLayout = new ScreenLayout({
            variants: layoutConfig.variants,
            layoutBuilder: this,
            name: layoutConfig.name,
        });

        const currentMode = this.variantByMode;
        screenLayout.setMode(currentMode);

        if (screenLayout.onScreenResize && typeof screenLayout.onScreenResize === "function") {
            screenLayout.onScreenResize(this.resizeSystem.getContext());
        }

        return screenLayout;
    }

    /**
     * Build a layout tree for a specific mode
     * @param {Object} config - Full component config with variants
     * @param {string} mode - Target mode (default, portrait, landscape)
     * @returns {Object} Built display object tree
     */
    buildLayoutForMode(config, mode) {
        const fullConfig = {
            name: config.name,
            type: "ComponentContainer",
            variants: config.variants,
        };

        return this.buildLayout(fullConfig, { isRoot: true, variant: mode });
    }

    /**
     * Check if a layout config has multiple variants (needs ScreenLayout)
     * @param {string|Object} layout - Layout name or config
     * @returns {boolean}
     */
    hasMultipleVariants(layout) {
        const layoutConfig = typeof layout === "string" ? this.getLayoutConfig(layout) : layout;

        if (!layoutConfig || !layoutConfig.variants) {
            return false;
        }

        const variantKeys = Object.keys(layoutConfig.variants);
        return variantKeys.length > 1;
    }
}
