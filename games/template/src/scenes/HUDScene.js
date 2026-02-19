import * as PIXI from "pixi.js";
import { Scene } from "onearm";

export class HUDScene extends Scene {
    create() {
        this._container = new PIXI.Container();
        this._container.label = "hudContainer";
        this.addChild(this._container);

        this._placeholder = new PIXI.Text({
            text: "HUD Scene",
            style: {
                fontFamily: "Arial, sans-serif",
                fontSize: 32,
                fill: 0x9aa4b2,
            },
        });
        this._placeholder.anchor.set(0.5);
        this._placeholder.position.set(1920 / 2, 1080 - 60);
        this._container.addChild(this._placeholder);
    }
}
