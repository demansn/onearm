import { RenderLayer } from "pixi.js";

import { Service } from "./Service.js";

export class GameLayers extends Service {
    init() {
        this.layers = {};
        this._baseZIndex = {};

        this.stage = this.services.get("app").stage;

        this.options.layers.forEach((name, index) => {
            this._baseZIndex[name] = index * 100;

            const layer = new RenderLayer();

            this.layers[name] = layer;
            layer.label = name;
            this[name] = layer;
            this.stage.addChild(layer);
        });
    }

    get(name) {
        return this.layers[name];
    }

    getBaseZIndex(name) {
        return this._baseZIndex[name] ?? 0;
    }
}
