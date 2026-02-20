import { Container } from "pixi.js";
import { getEngineContext } from "./EngineContext.js";
import { ObjectFactory } from "./ObjectFactory.js";
import { applyTintToChildren, restoreTints } from "../../utils/applyTintToChildren.js";
import { findByQuery, findAllByQuery } from "../displayObjects/findUtils.js";

/**
 * BaseContainer - base class for all game display objects.
 * Provides lifecycle management, child object creation via ObjectFactory,
 * tree search utilities, tinting, and component system.
 *
 * Previously known as SuperContainer.
 */
export class BaseContainer extends Container {
    #factory = null;

    /**
     * @type {Object}
     */
    data = null;

    get factory() {
        return this.#factory;
    }

    // Backward compat alias
    get mather() {
        return this.#factory;
    }

    components = [];

    /**
     * @param {Object} options
     * @param {string} [options.layer] - Layer name
     */
    constructor({ layer = "default" } = {}) {
        super();

        const ctx = getEngineContext();

        this.#factory = new ObjectFactory(
            this,
            ctx.textures,
            ctx.styles,
            ctx.layers,
            ctx.zone,
        );
        this.data = ctx.data;
    }

    addComponent(component) {
        this.components.push(component);
    }

    getComponent(name) {
        return this.components.find(c => c.name === name);
    }

    addChild(...children) {
        const objects = super.addChild(...children);

        return objects;
    }

    addObject(name, parameters = {}, props = {}) {
        const object = this.#factory.createObject(name, { ...parameters, ...props });

        return object;
    }

    createObject(name, properties = {}) {
        const object = this.#factory.createObject(name, properties);

        return object;
    }

    /**
     * Get object by name
     * @param {string} name
     * @returns {*}
     */
    getObjectByName(name) {
        return findByQuery(name, this.children);
    }

    /**
     * Find object by query with dot notation, e.g. "container1.container2.object"
     * @param {string} query
     * @returns {BaseContainer|null}
     */
    find(query) {
        return findByQuery(query, this.children);
    }

    /**
     * Get object by name or query
     * @param {string} query
     * @returns {*}
     */
    get(query) {
        return findByQuery(query, this.children);
    }

    /**
     * Find all objects by name or query
     * @param {string} query - Object name or dot notation query
     * @returns {Array}
     */
    findAll(query) {
        return findAllByQuery(query, this.children);
    }

    /**
     * Apply function to all objects with given name or query
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

        const objects = this.findAll(query);
        for (const obj of objects) {
            fn(obj);
        }
    }

    addToPlaceholder(placeholderName, child) {
        const placeholder = this.find(placeholderName);

        if (placeholder) {
            placeholder.addChild(child);
        }

        return child;
    }

    /**
     * Handle screen resize event
     * @param {Object} event
     */
    onScreenResize(event) {
        this.components.forEach(component => component.onScreenResize && component.onScreenResize(event));
    }

    setTint(colorHex) {
        applyTintToChildren(this, colorHex, { includeMeshes: true });
    }

    restoreTint() {
        restoreTints(this);
    }

    step(event) {
        try {
            this.components.forEach(component => component.step && component.step(event));
            this.children.forEach(child => {
                if (child.step && typeof child.step === "function") {
                    child.step(event);
                }
            });
        } catch (error) {
            console.error("Error in step:", error);
        }
    }

    destroy(...args) {
        super.destroy(...args);
        this.components.forEach(component => component.destroy && component.destroy());
        this.components = [];
    }
}
