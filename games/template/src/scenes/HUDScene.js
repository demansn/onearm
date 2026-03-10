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

        this._wireFullscreen();
    }

    _wireFullscreen() {
        const fullscreen = this.services.get("fullscreen");
        if (!fullscreen.isSupported) return;

        // Простая кнопка fullscreen — замени на layout toggle когда появится UI из Figma
        const btn = new PIXI.Text({
            text: "⛶",
            style: { fontFamily: "Arial, sans-serif", fontSize: 36, fill: 0xffffff },
        });
        btn.eventMode = "static";
        btn.cursor = "pointer";
        btn.anchor.set(1, 0);
        btn.position.set(1920 - 20, 20);
        btn.alpha = 0.6;
        btn.on("pointerup", () => fullscreen.toggleFullscreen());
        this._container.addChild(btn);
    }
}
