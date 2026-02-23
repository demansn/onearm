import { ObjectFactory } from "../common/core/ObjectFactory.js";
import { ScreenLayout } from "../common/displayObjects/ScreenLayout.js";
import { Service } from "./Service.js";
import { Slider } from "../common/unified/Slider.js";

export class LayoutBuilder extends Service {
    static layoutBuilders = {};

    static registerLayoutBuilder(type, builderFn) {
        LayoutBuilder.layoutBuilders[type] = builderFn;
    }

    static isComponentConfig(value) {
        return value && typeof value === 'object' && !Array.isArray(value)
            && typeof value.type === 'string' && /^[A-Z]/.test(value.type);
    }

    constructor(params) {
        super(params);

        const { services } = params;

        this.textures = services.get("resources");
        this.styles = services.get("styles");
        this.layers = services.get("layers");
        this.resizeSystem = services.get("resizeSystem");
        this.layoutSystem = services.get("layoutSystem");
        this.componentsConfig = this.textures.get("components.config");

        this.mather = new ObjectFactory({}, this.textures, this.styles, this.layers,  this.resizeSystem.getContext().zone);
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

        if (type === "ComponentContainer") {
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
            if (displayObject.updateLayout && typeof displayObject.updateLayout === "function") {
                displayObject.updateLayout();
            }
        } else {
            const builder = LayoutBuilder.layoutBuilders[type];
            if (builder) {
                displayObject = builder.call(this, { type, name, ...variantConfig, variants: config.variants, variant: properties.variant });
            } else {
                displayObject = this.buildComponent({ type, name, ...variantConfig });
            }
        }

        this.applyProperties(displayObject, configProperties);

        return displayObject;
    }

    buildComponent(config) {
        const { type, name, children, isInstance, variant, ...rest } = config;

        // Button/AnimationButton: first child becomes the image view for FancyButton hit area
        if ((type === 'Button' || type === 'AnimationButton') && children?.length && !rest.image) {
            const { name: childName, type: childType, children: _, isInstance: __, variant: ___, ...childProps } = children[0];
            const image = this.buildDisplayObject(childType, { name: childName, ...childProps });
            return this.buildDisplayObject(type, { name, image, ...rest });
        }

        // CheckBox backward compat: states.on/off → checked/unchecked
        if (type === 'CheckBoxComponent' && rest.states && !rest.checked) {
            if (rest.states.on) rest.checked = rest.states.on;
            if (rest.states.off) rest.unchecked = rest.states.off;
            if (rest.state !== undefined) rest.value = rest.state === 'on';
            delete rest.states;
            delete rest.state;
        }

        // Instance with layout config → delegate to buildLayout (respects variants)
        if (isInstance) {
            const layoutConfig = this.getLayoutConfig(type) || this.getLayoutConfig(name);
            if (layoutConfig) {
                const displayObject = this.buildLayout(layoutConfig, { name, variant: variant || 'default' });
                this.applyProperties(displayObject, rest);
                return displayObject;
            }
        }

        // Auto-build any field that looks like a component config
        const builtProps = { name };
        for (const [key, value] of Object.entries(rest)) {
            if (LayoutBuilder.isComponentConfig(value)) {
                builtProps[key] = this.buildComponent(value);
            } else if (Array.isArray(value) && value.length > 0 && LayoutBuilder.isComponentConfig(value[0])) {
                builtProps[key] = value.map(v => LayoutBuilder.isComponentConfig(v) ? this.buildComponent(v) : v);
            } else {
                builtProps[key] = value;
            }
        }

        // Fallback to SuperContainer if no factory registered for this type
        const resolvedType = this.mather.getObjectFactory(type) ? type : 'SuperContainer';
        const displayObject = this.buildDisplayObject(resolvedType, builtProps);
        this.applyProperties(displayObject, rest);

        // Delegate children to buildLayoutChildren (handles isInstance properly)
        if (children?.length) {
            displayObject.addChild(...this.buildLayoutChildren(children));
        }

        if (typeof displayObject.layout === "function") displayObject.layout();
        if (typeof displayObject.updateLayout === "function") displayObject.updateLayout();

        return displayObject;
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
                        const factoryName = this.mather.getObjectFactory(config.name) ? config.name : config.type;

                        if (this.mather.getObjectFactory(factoryName)) {
                            child = this.buildDisplayObject(factoryName, { name, ...objectProperties });
                        } else {
                            // No factory or config — build as generic container with inline children
                            child = this.buildComponent({ type: 'SuperContainer', name, children, ...objectProperties });
                        }
                    }

                child.label = name;
            } else {
                const childBuilder = LayoutBuilder.layoutBuilders[config.type];
                if (childBuilder) {
                    child = childBuilder.call(this, config);
                } else {
                    child = this.buildComponent(config);
                }
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
        displayObject.label = name;

        if (children && children.length > 0) {
            displayObject.addChild(...this.buildLayoutChildren(children));
        }

        children.forEach(config => {
            const child = displayObject.children.find(child => child.label === config.name);
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

    buildValueSliderLayout(config) {
        const { name, type, children, isInstance, ...configProperties } = config;
        const displayObject = new Slider();
        displayObject.label = name;

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
            "label",
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
                } else if (key === "name") {
                    displayObject.label = properties[key];
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
