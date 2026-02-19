import { RenderLayer } from "pixi.js";

import { Service } from "./Service.js";

export class GameLayers extends Service {
    init() {
        this.layers = {};

        this.stage = this.services.get("app").stage;

        this.options.layers.forEach(name => {
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
}
