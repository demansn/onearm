import { Container, Sprite } from "pixi.js";

import { services } from "../../ServiceLocator.js";

export class BitmapFont extends Container {
    constructor(fontName) {
        super();
        this.fontName = fontName;
    }

    setText(text) {
        this.removeChildren();
        let x = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const sprite = new Sprite(services.resources.get(`${this.fontName}_${char}`));

            sprite.x = x;
            this.addChild(sprite);
            x += sprite.width;
        }
    }
}
