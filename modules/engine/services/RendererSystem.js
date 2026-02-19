import { autoDetectRenderer, Container, isMobile } from "pixi.js";
import { initDevtools } from "@pixi/devtools";
import { Service } from "./Service.js";

export class RendererSystem extends Service {
    _renderer = null;
    _stage = null;

    get renderer() {
        return this._renderer;
    }

    get stage() {
        return this._stage;
    }

    get width() {
        return this.resolution.width;
    }
    get height() {
        return this.resolution.height;
    }

    get resolution() {
        return { width: 1920, height: 1080 };
    }

    get view() {
        return this._renderer.canvas;
    }

    get size() {
        return { width: this._renderer.width, height: this._renderer.height };
    }

    get isMobileDevice() {
        return isMobile.any;
    }

    async init() {
        // Setup body.
        document.body.style.margin = "0px";
        document.body.style.overflow = "hidden";
        document.body.style.background = "black";

        // Получаем размеры экрана
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        this._renderer = await autoDetectRenderer({
            preference: "webgl",
            width: screenWidth,
            height: screenHeight,
            backgroundColor: 0x000000,
            resolution: 2,
            autoDensity: true,
            antialias: true,
        });

        // Canvas на весь экран
        this._renderer.canvas.style.width = "100%";
        this._renderer.canvas.style.height = "100%";
        this._renderer.canvas.style.left = "0";
        this._renderer.canvas.style.top = "0";

        document.querySelector(".canvas-box").appendChild(this._renderer.canvas);

        this._stage = new Container();
        this._stage.eventMode = "static";

        this.root = new Container();
        this.root.label = "root";
        this.root.zIndex = 0;
        this._stage.addChild(this.root);

        globalThis.__PIXI_STAGE__ = this._stage;
        globalThis.__PIXI_RENDERER__ = this._renderer;

        initDevtools({ stage: this._stage, renderer: this._renderer });
    }

    render() {
        this._renderer.render(this._stage);
    }
}
