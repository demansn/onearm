/**
 * EngineContext - explicit container for global engine state.
 * Replaces SuperContainer static fields with a proper dependency.
 */
export class EngineContext {
    constructor({ textures, styles, layers, assets, zone, data, rendererSize }) {
        this.textures = textures;
        this.styles = styles;
        this.layers = layers;
        this.assets = assets;
        this.zone = zone;
        this.data = data;
        this.rendererSize = rendererSize;
    }
}

let _current = null;

/**
 * Set the current engine context. Called once during engine initialization.
 * @param {EngineContext} ctx
 */
export function setEngineContext(ctx) {
    _current = ctx;
}

/**
 * Get the current engine context.
 * @returns {EngineContext}
 */
export function getEngineContext() {
    if (!_current) {
        throw new Error("EngineContext not initialized. Call setEngineContext() first.");
    }
    return _current;
}
