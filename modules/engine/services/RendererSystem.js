import * as PIXI from "pixi.js";
import { Stage } from "@pixi/layers";
import { Container } from "pixi.js";
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
        return this._renderer.view;
    }

    get size() {
        return { width: this._renderer.width, height: this._renderer.height };
    }

    get isMobileDevice() {
        return PIXI.utils.isMobile.any;
    }

    init() {
        // Setup body.
        document.body.style.margin = "0px";
        document.body.style.overflow = "hidden";
        document.body.style.background = "black";

        // Получаем размеры экрана
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        this._renderer = new PIXI.Renderer({
            width: screenWidth,
            height: screenHeight,
            useContextAlpha: false,
            backgroundColor: 0x000000,
            resolution: 2,
            autoDensity: true,
            antialias: true,
            // powerPreference: 'high-performance',
        });

        // Canvas на весь экран
        this._renderer.view.style.width = "100%";
        this._renderer.view.style.height = "100%";
        // this._renderer.view.style.position = 'absolute';
        this._renderer.view.style.left = "0";
        this._renderer.view.style.top = "0";

        document.querySelector(".canvas-box").appendChild(this._renderer.view);

        this._stage = new Stage();
        this._stage.interactive = true;
        this._stage.sortableChildren = true;

        this.root = new Container();
        this.root.name = "root";
        this.root.zIndex = this.root.zOrder = 0;
        this._stage.addChild(this.root);

        globalThis.__PIXI_STAGE__ = this._stage;
        globalThis.__PIXI_RENDERER__ = this._renderer;
    }

    // step(event) {
    //     this.root.children.forEach((child) => child.step && child.step(event));
    // }

    render() {
        this._renderer.render(this._stage);
    }
}
