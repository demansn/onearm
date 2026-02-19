import { Container } from "pixi.js";

/**
 * Polyfill for @pixi/layers parentLayer property.
 * In PixiJS v8, @pixi/layers is replaced by built-in RenderLayer.
 * This polyfill allows existing code using `obj.parentLayer = layer`
 * to work with RenderLayer's attach/detach API.
 */
Object.defineProperty(Container.prototype, "parentLayer", {
    set(layer) {
        if (this._renderLayer) {
            this._renderLayer.detach(this);
        }
        if (layer?.attach) {
            layer.attach(this);
            this._renderLayer = layer;
        } else {
            this._renderLayer = null;
        }
    },
    get() {
        return this._renderLayer || null;
    },
});
