import * as PIXI from "pixi.js";

/**
 * Component Builder class for creating Pixi objects from Figma config
 */
export class ComponentBuilder {
    constructor() {
        this.componentInstances = new Map();
        this.componentsConfig = null;
    }

    /**
     * Load components configuration
     * @param {Object} config - Components configuration object
     */
    loadConfig(config) {
        this.componentsConfig = config;
    }

    /**
     * Find component by name in loaded config
     * @param {string} name - Component name
     * @returns {Object|null}
     */
    findComponent(name) {
        if (!this.componentsConfig || !this.componentsConfig.components) {
            console.warn("No components config loaded");
            return null;
        }
        return this.componentsConfig.components.find(component => component.name === name);
    }

    /**
     * Get all components of specific type
     * @param {string} type - Component type
     * @returns {Array<Object>}
     */
    getComponentsByType(type) {
        if (!this.componentsConfig || !this.componentsConfig.components) {
            return [];
        }
        return this.componentsConfig.components.filter(component => component.type === type);
    }

    /**
     * Create Pixi object from component config
     * @param {Object} config - Component configuration
     * @param {Object} options - Build options
     * @returns {PIXI.Container}
     */
    build(config, options = {}) {
        const { registerAsComponent = true, applyTransforms = true, createMasks = true } = options;

        const pixiObject = this.createPixiObject(config);

        if (applyTransforms) {
            this.applyCommonProperties(pixiObject, config);
        }

        this.applyTypeSpecificProperties(pixiObject, config);

        // Build children
        if (config.children && config.children.length > 0) {
            config.children.forEach(childConfig => {
                const child = this.build(childConfig, options);
                pixiObject.addChild(child);
            });
        }

        if (registerAsComponent && config.name) {
            this.componentInstances.set(config.name, pixiObject);
        }

        return pixiObject;
    }

    /**
     * Build component by name from config
     * @param {string} componentName - Name of component to build
     * @param {Object} options - Build options
     * @returns {PIXI.Container|null}
     */
    buildByName(componentName, options = {}) {
        const config = this.findComponent(componentName);
        if (!config) {
            console.warn(`Component "${componentName}" not found in config`);
            return null;
        }
        return this.build(config, options);
    }

    /**
     * Create appropriate Pixi object based on type
     * @param {Object} config - Component configuration
     * @returns {PIXI.Container}
     */
    createPixiObject(config) {
        switch (config.type) {
            case "SuperContainer":
            case "Component":
                return new PIXI.Container();

            case "AutoLayout":
                return this.createAutoLayout(config);

            case "Text":
                return this.createText(config);

            case "Rectangle":
                return this.createRectangle(config);

            case "Ellipse":
                return this.createEllipse(config);

            case "Graphics":
                return new PIXI.Graphics();

            default:
                console.warn(`Unknown component type: ${config.type}`);
                return new PIXI.Container();
        }
    }

    /**
     * Create AutoLayout container with flex-like behavior
     * @param {Object} config - AutoLayout configuration
     * @returns {PIXI.Container}
     */
    createAutoLayout(config) {
        const container = new PIXI.Container();

        // Store AutoLayout config for later application
        container._autoLayoutConfig = {
            flow: config.flow || "horizontal",
            gap: config.gap || 0,
            alignContent: config.alignContent || { x: "left", y: "top" },
        };

        return container;
    }

    /**
     * Create Text object
     * @param {Object} config - Text configuration
     * @returns {PIXI.Text}
     */
    createText(config) {
        const styleOptions = {
            fontFamily: config.fontFamily || "Arial",
            fontSize: config.fontSize || 16,
            fontWeight: config.fontWeight || "normal",
            fill: config.fill || "#000000",
            align: config.align || "left",
            letterSpacing: config.letterSpacing || 0,
            lineHeight: config.lineHeight,
        };

        if (config.strokeThickness || config.stroke) {
            const strokeWidth = config.strokeThickness || 0;
            if (strokeWidth > 0 && config.stroke) {
                styleOptions.stroke = { color: config.stroke, width: strokeWidth };
            }
        }

        const style = new PIXI.TextStyle(styleOptions);

        return new PIXI.Text({ text: config.text || "", style });
    }

    /**
     * Create Rectangle graphics
     * @param {Object} config - Rectangle configuration
     * @returns {PIXI.Graphics}
     */
    createRectangle(config) {
        const graphics = new PIXI.Graphics();

        const width = config.width || 100;
        const height = config.height || 100;

        if (config.cornerRadius) {
            const radius = typeof config.cornerRadius === "number"
                ? config.cornerRadius
                : config.cornerRadius.topLeft || 0;
            graphics.roundRect(0, 0, width, height, radius);
        } else {
            graphics.rect(0, 0, width, height);
        }

        if (config.fill) {
            graphics.fill({ color: config.fill });
        }

        if (config.stroke) {
            if (config.cornerRadius) {
                const radius = typeof config.cornerRadius === "number"
                    ? config.cornerRadius
                    : config.cornerRadius.topLeft || 0;
                graphics.roundRect(0, 0, width, height, radius);
            } else {
                graphics.rect(0, 0, width, height);
            }
            graphics.stroke({ width: config.strokeWidth || 1, color: config.stroke });
        }

        return graphics;
    }

    /**
     * Create Ellipse graphics
     * @param {Object} config - Ellipse configuration
     * @returns {PIXI.Graphics}
     */
    createEllipse(config) {
        const graphics = new PIXI.Graphics();

        const width = config.width || 100;
        const height = config.height || 100;

        graphics.ellipse(width / 2, height / 2, width / 2, height / 2);

        if (config.fill) {
            graphics.fill({ color: config.fill });
        }

        if (config.stroke) {
            graphics.ellipse(width / 2, height / 2, width / 2, height / 2);
            graphics.stroke({ width: config.strokeWidth || 1, color: config.stroke });
        }

        return graphics;
    }

    /**
     * Apply common properties to Pixi object
     * @param {PIXI.Container} pixiObject - Target Pixi object
     * @param {Object} config - Component configuration
     */
    applyCommonProperties(pixiObject, config) {
        if (config.name) pixiObject.label = config.name;
        if (config.x !== undefined) pixiObject.x = config.x;
        if (config.y !== undefined) pixiObject.y = config.y;
        if (config.width !== undefined && pixiObject.width !== undefined) {
            // Only set width if object supports it and it's not auto-sized
            if (config.type !== "Text") {
                pixiObject.width = config.width;
            }
        }
        if (config.height !== undefined && pixiObject.height !== undefined) {
            if (config.type !== "Text") {
                pixiObject.height = config.height;
            }
        }
        if (config.alpha !== undefined) pixiObject.alpha = config.alpha;
        if (config.visible !== undefined) pixiObject.visible = config.visible;
        if (config.rotation !== undefined) pixiObject.rotation = config.rotation;
    }

    /**
     * Apply type-specific properties
     * @param {PIXI.Container} pixiObject - Target Pixi object
     * @param {Object} config - Component configuration
     */
    applyTypeSpecificProperties(pixiObject, config) {
        // Apply AutoLayout after all children are added
        if (config.type === "AutoLayout" && pixiObject._autoLayoutConfig) {
            // Defer AutoLayout application until after children are built
            setTimeout(() => this.applyAutoLayout(pixiObject, pixiObject._autoLayoutConfig), 0);
        }
    }

    /**
     * Apply AutoLayout positioning to children
     * @param {PIXI.Container} container - AutoLayout container
     * @param {Object} layoutConfig - Layout configuration
     */
    applyAutoLayout(container, layoutConfig) {
        if (container.children.length === 0) return;

        const { flow, gap, alignContent } = layoutConfig;

        let currentX = 0;
        let currentY = 0;

        container.children.forEach((child, index) => {
            child.x = currentX;
            child.y = currentY;

            if (flow === "horizontal") {
                currentX += child.width + (index < container.children.length - 1 ? gap : 0);
            } else if (flow === "vertical") {
                currentY += child.height + (index < container.children.length - 1 ? gap : 0);
            }
        });

        // Apply alignment
        if (alignContent) {
            this.applyAlignment(container, alignContent);
        }
    }

    /**
     * Apply alignment to container children
     * @param {PIXI.Container} container - Container to align
     * @param {Object} alignContent - Alignment configuration
     */
    applyAlignment(container, alignContent) {
        if (container.children.length === 0) return;

        const { x: alignX, y: alignY } = alignContent;

        // Get container bounds
        const bounds = container.getBounds();

        // Apply horizontal alignment
        if (alignX === "center") {
            const offsetX = (container.width - bounds.width) / 2;
            container.children.forEach(child => {
                child.x += offsetX;
            });
        } else if (alignX === "right") {
            const offsetX = container.width - bounds.width;
            container.children.forEach(child => {
                child.x += offsetX;
            });
        }

        // Apply vertical alignment
        if (alignY === "center") {
            const offsetY = (container.height - bounds.height) / 2;
            container.children.forEach(child => {
                child.y += offsetY;
            });
        } else if (alignY === "bottom") {
            const offsetY = container.height - bounds.height;
            container.children.forEach(child => {
                child.y += offsetY;
            });
        }
    }

    /**
     * Get component instance by name
     * @param {string} name - Component name
     * @returns {PIXI.Container|undefined}
     */
    getInstance(name) {
        return this.componentInstances.get(name);
    }

    /**
     * Get all component instances
     * @returns {Map<string, PIXI.Container>}
     */
    getAllInstances() {
        return this.componentInstances;
    }

    /**
     * Clear all component instances
     */
    clearInstances() {
        this.componentInstances.clear();
    }
}

/**
 * Helper functions for component manipulation
 */
export class ComponentHelpers {
    /**
     * Find child component by name recursively
     * @param {PIXI.Container} parent - Parent container
     * @param {string} name - Child name to find
     * @returns {PIXI.Container|null}
     */
    static findChild(parent, name) {
        if (parent.label === name) return parent;

        if (parent.children) {
            for (const child of parent.children) {
                const found = ComponentHelpers.findChild(child, name);
                if (found) return found;
            }
        }

        return null;
    }

    /**
     * Find all children of specific type
     * @param {PIXI.Container} parent - Parent container
     * @param {Function} typeClass - Pixi class constructor (e.g., PIXI.Text)
     * @returns {Array<PIXI.Container>}
     */
    static findChildrenOfType(parent, typeClass) {
        const results = [];

        if (parent instanceof typeClass) {
            results.push(parent);
        }

        if (parent.children) {
            parent.children.forEach(child => {
                results.push(...ComponentHelpers.findChildrenOfType(child, typeClass));
            });
        }

        return results;
    }

    /**
     * Update text in all Text objects recursively
     * @param {PIXI.Container} parent - Parent container
     * @param {Object} textMap - Map of name -> new text
     */
    static updateTexts(parent, textMap) {
        if (parent instanceof PIXI.Text && parent.label && textMap[parent.label]) {
            parent.text = textMap[parent.label];
        }

        if (parent.children) {
            parent.children.forEach(child => {
                ComponentHelpers.updateTexts(child, textMap);
            });
        }
    }

    /**
     * Apply theme colors to components
     * @param {PIXI.Container} parent - Parent container
     * @param {Object} colorTheme - Map of property -> color
     */
    static applyTheme(parent, colorTheme) {
        // Apply to Graphics objects
        if (parent instanceof PIXI.Graphics && colorTheme.fill) {
            parent.tint = colorTheme.fill;
        }

        // Apply to Text objects
        if (parent instanceof PIXI.Text && colorTheme.text) {
            parent.style.fill = colorTheme.text;
        }

        if (parent.children) {
            parent.children.forEach(child => {
                ComponentHelpers.applyTheme(child, colorTheme);
            });
        }
    }

    /**
     * Animate component properties
     * @param {PIXI.Container} target - Target object
     * @param {Object} toProps - Target properties
     * @param {number} duration - Animation duration in ms
     * @returns {Promise}
     */
    static animate(target, toProps, duration = 300) {
        return new Promise(resolve => {
            const startProps = {};
            const deltaProps = {};

            // Store initial values and calculate deltas
            Object.keys(toProps).forEach(key => {
                startProps[key] = target[key];
                deltaProps[key] = toProps[key] - startProps[key];
            });

            const startTime = Date.now();

            function update() {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Easing function (ease-out)
                const eased = 1 - Math.pow(1 - progress, 3);

                Object.keys(toProps).forEach(key => {
                    target[key] = startProps[key] + deltaProps[key] * eased;
                });

                if (progress < 1) {
                    requestAnimationFrame(update);
                } else {
                    resolve();
                }
            }

            requestAnimationFrame(update);
        });
    }
}

// Default instance for easy use
export const componentBuilder = new ComponentBuilder();
