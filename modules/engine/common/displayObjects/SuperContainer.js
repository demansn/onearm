import { Container } from "pixi.js";
import { Mather } from "./Mather.js";
import { applyTintToChildren, restoreTints } from "../../utils/applyTintToChildren.js";
import { findByQuery, findAllByQuery } from "./findUtils.js";

export class SuperContainer extends Container {
    static textures = null;
    static styles = null;
    static layers = null;
    static assets = null;
    static screenSize = { width: 0, height: 0 };
    static data;

    #mather = null;

    /**
     * @type {DataModel }
     */
    data = null;

    get mather() {
        return this.#mather;
    }

    components = [];

    /**
     * @param {Object} options
     * @param {string} [options.layer] - Layer name
     */
    constructor({ layer = "default" } = {}) {
        super();

        if (!SuperContainer.textures || !SuperContainer.styles || !SuperContainer.layers) {
            throw new Error(
                "SuperContainer: textures, styles and layers must be set before creating gameObjects",
            );
        }

        const zone = SuperContainer.zone;

        this.#mather = new Mather(
            this,
            SuperContainer.textures,
            SuperContainer.styles,
            SuperContainer.layers,
            zone,
        );
        this.data = SuperContainer.data;
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
        const object = this.#mather.createObject(name, { ...parameters, ...props });

        return object;
    }

    createObject(name, properties = {}) {
        const object = this.#mather.createObject(name, properties);

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
     * @returns {SuperContainer|null}
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

