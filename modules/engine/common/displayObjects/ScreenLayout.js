import { Container } from "pixi.js";
import { Signal } from "typed-signals";
import { findByQuery, findAllByQuery } from "./findUtils.js";

/**
 * Container that manages multiple layout trees for different screen modes.
 * Creates all layouts eagerly and switches between them on screen resize.
 * @extends Container
 */
export class ScreenLayout extends Container {
    #layouts = new Map();
    #activeLayout = null;
    #activeMode = null;
    #modesConfig;
    #layoutBuilder;
    #componentName;

    /**
     * @param {Object} options
     * @param {Object} options.modes - Layout configs keyed by mode name
     * @param {Object} options.layoutBuilder - LayoutBuilder service instance
     * @param {string} [options.name] - Component name for debugging
     * @param {boolean} [options.isMobile] - Whether running on mobile device
     */
    constructor({ modes, layoutBuilder, name, isMobile }) {
        super();

        this.#modesConfig = this.#filterModes(modes, isMobile);
        this.#layoutBuilder = layoutBuilder;
        this.#componentName = name;
        this.label = name;

        this.onLayoutChange = new Signal();

        this.#buildAllLayouts();
    }

    /**
     * Filter modes to only include those relevant for the device.
     * Desktop: "default" and/or "desktop".
     * Mobile: "portrait" and "landscape" (+ "default" as fallback if one is missing).
     */
    #filterModes(modes, isMobile) {
        const allKeys = Object.keys(modes);

        let relevantKeys;

        if (isMobile) {
            const hasBothMobile = allKeys.includes("portrait") && allKeys.includes("landscape");
            relevantKeys = hasBothMobile
                ? allKeys.filter(k => k === "portrait" || k === "landscape")
                : allKeys.filter(k => k !== "desktop");
        } else {
            relevantKeys = allKeys.filter(k => k === "default" || k === "desktop");
        }

        if (relevantKeys.length === 0) return modes;

        return Object.fromEntries(relevantKeys.map(k => [k, modes[k]]));
    }

    /**
     * Build all layouts from variants config eagerly
     */
    #buildAllLayouts() {
        for (const mode of Object.keys(this.#modesConfig)) {
            this.#getOrCreateLayout(mode);
        }
    }

    /**
     * Get or create layout for specified mode
     * @param {string} mode
     * @returns {Container}
     */
    #getOrCreateLayout(mode) {
        if (this.#layouts.has(mode)) {
            return this.#layouts.get(mode);
        }

        // If mode not in config, use "default" layout instead of creating duplicate
        const effectiveMode = this.#modesConfig[mode] ? mode : "default";

        // If fallback to default, return existing default layout
        if (effectiveMode !== mode && this.#layouts.has(effectiveMode)) {
            return this.#layouts.get(effectiveMode);
        }

        const modeConfig = this.#modesConfig[effectiveMode];
        if (!modeConfig) {
            console.warn(`ScreenLayout: no config for mode "${mode}" and no default for ${this.#componentName}`);
            return null;
        }

        const layout = this.#layoutBuilder.buildLayoutForMode(
            { modes: this.#modesConfig, name: this.#componentName },
            effectiveMode
        );

        if (layout) {
            layout.visible = false;
            this.#layouts.set(effectiveMode, layout);
            this.addChild(layout);
        }

        return layout;
    }

    /**
     * Switch to layout for specified mode
     * @param {string} mode
     */
    setMode(mode) {
        if (mode === this.#activeMode) {
            return;
        }

        const previousMode = this.#activeMode;
        const previousLayout = this.#activeLayout;

        if (this.#activeLayout) {
            this.#activeLayout.visible = false;
        }

        this.#activeLayout = this.#getOrCreateLayout(mode);

        if (this.#activeLayout) {
            this.#activeLayout.visible = true;
        }

        this.#activeMode = mode;

        // Sync behavior states between previous and new layout
        if (previousLayout && this.#activeLayout) {
            const prevBehaviors = this.#collectBehaviors(previousLayout);
            const newBehaviors = this.#collectBehaviors(this.#activeLayout);
            for (const [label, prevB] of prevBehaviors) {
                const newB = newBehaviors.get(label);
                if (newB && newB.getState && prevB.getState) {
                    newB.setState(prevB.getState());
                }
            }
        }

        this.onLayoutChange.emit({
            from: previousMode,
            to: mode,
            fromLayout: previousLayout,
            toLayout: this.#activeLayout,
        });
    }

    #collectBehaviors(layout) {
        const map = new Map();
        if (!layout) return map;
        const walk = (node) => {
            if (node._behavior) map.set(node.label, node._behavior);
            if (node.children) for (const child of node.children) walk(child);
        };
        walk(layout);
        return map;
    }

    /**
     * Get current active layout
     * @returns {Container|null}
     */
    get current() {
        return this.#activeLayout;
    }

    /**
     * Get current mode
     * @returns {string|null}
     */
    get mode() {
        return this.#activeMode;
    }

    /**
     * Get all available modes
     * @returns {string[]}
     */
    get availableModes() {
        return Object.keys(this.#modesConfig);
    }

    /**
     * Get object by name or query from current layout
     * @param {string} query - Object name or dot notation query
     * @returns {*}
     */
    get(query) {
        if (!this.#activeLayout) {
            return null;
        }

        return findByQuery(query, this.#activeLayout.children);
    }

    /**
     * Find object by query with dot notation in current layout
     * @param {string} query
     * @returns {*}
     */
    find(query) {
        if (!this.#activeLayout) {
            return null;
        }

        if (this.#activeLayout.find) {
            return this.#activeLayout.find(query);
        }

        return findByQuery(query, this.#activeLayout.children);
    }

    /**
     * Find all objects by name or query across ALL layouts
     * @param {string} query - Object name or dot notation query
     * @returns {Array}
     */
    findAll(query) {
        const results = [];

        this.forEachLayout((layout) => {
            const found = findAllByQuery(query, layout.children);
            results.push(...found);
        });

        return results;
    }

    /**
     * Iterate over all layouts
     * @param {Function} fn
     */
    forEachLayout(fn) {
        for (const layout of this.#layouts.values()) {
            fn(layout);
        }
    }

    /**
     * Apply function to all instances of object with given name or query across ALL layouts
     * @param {string | string[]} query - Object name or dot notation query (or array of queries)
     * @param {Function} fn - Function to apply to each found object
     */
    forAll(query, fn) {
        if (Array.isArray(query)) {
            for (const q of query) {
                this.forAll(q, fn);
            }
            return;
        }

        this.forEachLayout((layout) => {
            const objects = findAllByQuery(query, layout.children);
            for (const obj of objects) {
                fn(obj);
            }
        });
    }

    /**
     * Apply function to all instances of object in current layout
     * @param {string | string[]} query - Object name or dot notation query (or array of queries)
     * @param {Function} fn
     */
    forAllInCurrentLayout(query, fn) {
        if (Array.isArray(query)) {
            for (const q of query) {
                this.forAllInCurrentLayout(q, fn);
            }
            return;
        }

        const objects = findAllByQuery(query, this.#activeLayout.children);
        for (const obj of objects) {
            fn(obj);
        }
    }

    /**
     * Find all objects by name or query in current layout
     * @param {string} query - Object name or dot notation query
     * @returns {Array}
     */
    findAllInCurrentLayout(query) {
        return findAllByQuery(query, this.#activeLayout.children);
    }

    /**
     * Find object by name or query in current layout
     * @param {string} query - Object name or dot notation query
     * @returns {*}
     */
    findInCurrentLayout(query) {
        return findByQuery(query, this.#activeLayout.children);
    }

    /**
     * Handle screen resize event
     * @param {Object} event
     * @param {string} event.mode
     */
    onScreenResize(event) {
        const { mode } = event;
        this.setMode(mode);

        if (this.#activeLayout && this.#activeLayout.onScreenResize) {
            this.#activeLayout.onScreenResize(event);
        }
    }

    /**
     * Propagate step to active layout
     * @param {Object} event
     */
    step(event) {
        if (this.#activeLayout && this.#activeLayout.step) {
            this.#activeLayout.step(event);
        }
    }

    /**
     * Destroy all layouts
     * @param {Object} options
     */
    destroy(options) {
        for (const layout of this.#layouts.values()) {
            if (layout.destroy) {
                layout.destroy(options);
            }
        }

        this.#layouts.clear();
        this.#activeLayout = null;
        this.#activeMode = null;

        super.destroy(options);
    }
}

