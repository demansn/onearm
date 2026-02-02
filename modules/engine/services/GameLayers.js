import { Layer } from "@pixi/layers";

import { Service } from "./Service.js";

export class GameLayers extends Service {
    init() {
        this.layers = {};

        this.stage = this.services.get("app").stage;

        this.options.layers.forEach(name => {
            const layer = new Layer();

            this.layers[name] = layer;
            layer.name = name;
            this[name] = layer;
            this.stage.addChild(layer);
        });
    }

    get(name) {
        return this.layers[name];
    }
}
