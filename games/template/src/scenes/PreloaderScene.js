import * as PIXI from "pixi.js";
import { Scene } from "onearm";

export class PreloaderScene extends Scene {
    create() {
        this._bg = new PIXI.Graphics();
        this.addChild(this._bg);

        this._barBg = new PIXI.Graphics();
        this.addChild(this._barBg);

        this._barFill = new PIXI.Graphics();
        this.addChild(this._barFill);

        this._label = new PIXI.Text({
            text: "Loading... 0%",
            style: {
                fontFamily: "Arial, sans-serif",
                fontSize: 28,
                fill: 0xffffff,
            },
        });
        this._label.anchor.set(0.5);
        this.addChild(this._label);

        this._progress = 0;
        this._drawLayout();
    }

    setProgress(value) {
        this._progress = Math.min(100, Math.max(0, value));
        this._label.text = `Loading... ${Math.round(this._progress)}%`;
        this._drawBar();
    }

    _drawLayout() {
        const w = 1920;
        const h = 1080;

        this._bg.clear();
        this._bg.rect(0, 0, w, h);
        this._bg.fill(0x0a0e14);

        const barW = 400;
        const barH = 12;
        const barX = (w - barW) / 2;
        const barY = h / 2 + 20;

        this._barBg.clear();
        this._barBg.roundRect(barX, barY, barW, barH, 6);
        this._barBg.fill(0x2a2f38);

        this._label.position.set(w / 2, barY - 30);

        this._barX = barX;
        this._barY = barY;
        this._barW = barW;
        this._barH = barH;

        this._drawBar();
    }

    _drawBar() {
        const fillW = this._barW * (this._progress / 100);

        this._barFill.clear();
        if (fillW > 0) {
            this._barFill.roundRect(this._barX, this._barY, fillW, this._barH, 6);
            this._barFill.fill(0x4a9eff);
        }
    }
}
