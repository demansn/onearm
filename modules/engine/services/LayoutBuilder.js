import { ObjectFactory } from "../common/core/ObjectFactory.js";
import { ScreenLayout } from "../common/displayObjects/ScreenLayout.js";
import { Service } from "./Service.js";
import { Slider } from "../common/unified/Slider.js";
import { ScrollBar } from "../common/unified/ScrollBar.js";

export class LayoutBuilder extends Service {
    static layoutBuilders = {};

    static registerLayoutBuilder(type, builderFn) {
        LayoutBuilder.layoutBuilders[type] = builderFn;
    }

    static isComponentConfig(value) {
        return value && typeof value === 'object' && !Array.isArray(value)
            && typeof value.type === 'string' && (/^[A-Z]/.test(value.type) || value.isInstance);
    }

    constructor(params) {
        super(params);

        const { services } = params;

        this.textures = services.get("resources");
        this.styles = services.get("styles");
        this.layers = services.get("layers");
        this.resizeSystem = services.get("resizeSystem");
        this.componentsConfig = this.textures.get("components.config");

        this.mather = new ObjectFactory({}, this.textures, this.styles, this.layers,  this.resizeSystem.getContext().zone);
        this.behaviorsConfig = this.gameConfig?.behaviors || null;

        this._layoutConfigMap = new Map(this.componentsConfig.components.map(c => [c.name, c]));
    }

    getLayoutConfig(name) {
        return this._layoutConfigMap.get(name);
    }

    getConfig(name) {
        return this.getLayoutConfig(name);
    }

    get variantByMode() {
        return this.resizeSystem.getContext().mode;
    }

    build(layout) {
        const layoutConfig = typeof layout === "string" ? this.getLayoutConfig(layout) : layout;

        // Scene with modes → delegate to buildScreenLayout
        if (layoutConfig.modes) {
            return this.buildScreenLayout(layoutConfig);
        }

        const variant = this.variantByMode;
        const displayObject = this.buildLayout(layoutConfig, { isRoot: true, variant });

        this.resizeSystem.callOnContainerResize(displayObject, this.resizeSystem.getContext());

        return displayObject;
    }

    buildLayout(config, properties = { isRoot: false, variant: "default" }) {
        const variant = properties.variant || "default";
        const variantConfig = this.#resolveVariant(config, variant);
        const { type, name } = config;
        const { children = [], ...configProperties } = variantConfig;
        let displayObject;

        if (type === "BaseContainer") {
            displayObject = this.buildDisplayObject(type, {
                name,
                isRoot: properties.isRoot,
                variants: config.variants,
                ...configProperties,
            });

            if (children.length > 0) {
                displayObject.addChild(...this.buildLayoutChildren(children));
            }

            this.#runLayout(displayObject);
        } else {
            const builder = LayoutBuilder.layoutBuilders[type];
            if (builder) {
                displayObject = builder.call(this, { type, name, ...variantConfig, variants: config.variants, variant: properties.variant });
            } else {
                displayObject = this.buildComponent({ type, name, ...variantConfig });
            }
        }

        this.applyProperties(displayObject, configProperties);
        this.#attachBehavior(displayObject, config);

        return displayObject;
    }

    #resolveVariant(config, variant = 'default') {
        let variantConfig = config.variants
            ? config.variants[variant] || config.variants.default || {}
            : config;
        if (Array.isArray(variantConfig)) {
            variantConfig = variantConfig[0] || {};
        }
        return variantConfig;
    }

    #runLayout(displayObject) {
        if (typeof displayObject.layout === "function") displayObject.layout();
        if (typeof displayObject.updateLayout === "function") displayObject.updateLayout();
    }

    #attachBehavior(displayObject, config) {
        if (!displayObject.addComponent) return;
        if (displayObject._behavior) return;

        const behaviorKey = config.isInstance ? config.type : config.name;
        const entry = this.behaviorsConfig?.[behaviorKey];
        if (!entry) return;

        const { Behavior: BehaviorCls, ...behaviorOptions } = entry;
        const behavior = new BehaviorCls(displayObject, behaviorOptions);
        displayObject._behavior = behavior;
        displayObject.addComponent(behavior);
    }

    buildComponent(config) {
        const { type, name, children, isInstance, variant, ...rest } = config;

        // Button: first child becomes the image view for FancyButton hit area
        if (type === 'Button' && children?.length && !rest.image) {
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
            const layoutConfig = this.getLayoutConfig(type);
            if (layoutConfig) {
                const displayObject = this.buildLayout(layoutConfig, { name, variant: variant || 'default' });
                this.applyProperties(displayObject, rest);
                return displayObject;
            }

            // Instance without layout config — try factory, then fallback to BaseContainer
            const hasNameFactory = this.mather.getObjectFactory(name);
            const factoryName = hasNameFactory ? name : type;
            if (hasNameFactory || this.mather.getObjectFactory(type)) {
                const displayObject = this.buildDisplayObject(factoryName, { name, ...rest });
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

        // Fallback to BaseContainer if no factory registered for this type
        const resolvedType = this.mather.getObjectFactory(type) ? type : 'BaseContainer';
        const displayObject = this.buildDisplayObject(resolvedType, builtProps);
        this.applyProperties(displayObject, rest);

        // Delegate children to buildLayoutChildren (handles isInstance properly)
        if (children?.length) {
            displayObject.addChild(...this.buildLayoutChildren(children));
        }

        this.#runLayout(displayObject);

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
        return configs.map(config => {
            const { name, variant, type, children, isInstance, ...objectProperties } = config;

            let child;
            const childBuilder = LayoutBuilder.layoutBuilders[type];

            if (childBuilder) {
                let builderConfig = config;

                if (isInstance && !children) {
                    const layoutConfig = this.getLayoutConfig(type) || this.getLayoutConfig(name);
                    if (layoutConfig) {
                        const vc = this.#resolveVariant(layoutConfig, variant || 'default');
                        builderConfig = { ...vc, ...config, children: vc.children };
                    }
                }

                child = childBuilder.call(this, builderConfig);
            } else {
                child = this.buildComponent(config);
            }

            if (isInstance) {
                child.label = name;
            }

            this.applyProperties(child, objectProperties);
            this.#runLayout(child);

            return child;
        });
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
        const { name, type, children = [], isInstance, ...configProperties } = config;
        const displayObject = this.buildDisplayObject(type, { name, ...configProperties });
        displayObject.label = name;

        if (children.length > 0) {
            displayObject.addChild(...this.buildLayoutChildren(children));
        }

        const childMap = new Map(displayObject.children.map(c => [c.label, c]));
        children.forEach(config => {
            const child = childMap.get(config.name);
            const { name, variant, children, isInstance, ...objectProperties } = config;

            if (child) {
                 if (objectProperties.align) {
                     child.display = { align: objectProperties.align, offset: objectProperties.offset };
                 }
                 this.applyProperties(child, objectProperties);
                 this.#runLayout(child);
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

    buildScrollBarLayout(config) {
        const { name, type, children, isInstance, ...configProperties } = config;
        const displayObject = new ScrollBar();
        displayObject.label = name;

        if (children && children.length > 0) {
            displayObject.addChild(...this.buildLayoutChildren(children));
        }

        displayObject.init();

        return displayObject;
    }

    static #PROPERTY_KEYS = new Set([
        "x", "y", "width", "height", "angle", "alpha", "visible",
        "label", "name", "anchorX", "anchorY", "scale",
        "colorStops", "gradientType", "gradientAngle", "gradientCenter", "gradientRadius",
    ]);

    applyProperties(displayObject, properties) {
        for (const key in properties) {
            if (LayoutBuilder.#PROPERTY_KEYS.has(key)) {
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

        if (!layoutConfig || !layoutConfig.modes) {
            throw new Error(`ScreenLayout requires a config with modes: ${layout}`);
        }

        const screenLayout = new ScreenLayout({
            modes: layoutConfig.modes,
            layoutBuilder: this,
            name: layoutConfig.name,
            isMobile: this.resizeSystem.app.isMobileDevice,
        });

        const currentMode = this.variantByMode;
        screenLayout.setMode(currentMode);

        this.resizeSystem.callOnContainerResize(screenLayout, this.resizeSystem.getContext());

        return screenLayout;
    }

    /**
     * Build a layout tree for a specific mode
     * @param {Object} config - Full component config with modes
     * @param {string} mode - Target mode (default, portrait, landscape)
     * @returns {Object} Built display object tree
     */
    buildLayoutForMode(config, mode) {
        const modeConfig = config.modes[mode];
        if (!modeConfig) return null;

        const fullConfig = {
            name: config.name,
            type: modeConfig.type || "BaseContainer",
            ...modeConfig,
        };

        return this.buildLayout(fullConfig, { isRoot: true, variant: "default" });
    }
}
