import * as PIXI from "pixi.js";
import { BaseState, Game, ServicesConfig } from "../../../modules/engine/index.js";

class SandboxState extends BaseState {
    enter() {
        super.enter();

        const app = this.services.get("app");
        const resources = this.services.get("resources");
        const resizeSystem = this.services.get("resizeSystem");

        this.container = new PIXI.Container();
        this.container.name = "sandboxContainer";
        this.container.onScreenResize = context => this.layout(context);
        app.root.addChild(this.container);

        this.bg = new PIXI.Graphics();
        this.container.addChild(this.bg);

        const logoTexture = resources.get("logo");
        if (logoTexture) {
            this.logo = new PIXI.Sprite(logoTexture);
            this.logo.anchor.set(0.5);
            this.container.addChild(this.logo);
        }

        this.title = new PIXI.Text("Sandbox", {
            fontFamily: "Arial, sans-serif",
            fontSize: 56,
            fill: 0xffffff,
        });
        this.title.anchor.set(0.5);
        this.container.addChild(this.title);

        this.subtitle = new PIXI.Text("Engine dev playground", {
            fontFamily: "Arial, sans-serif",
            fontSize: 24,
            fill: 0x9aa4b2,
        });
        this.subtitle.anchor.set(0.5);
        this.container.addChild(this.subtitle);

        this.layout(resizeSystem.getContext());
    }

    layout(context) {
        if (!context) {
            return;
        }

        const { resolution } = context;
        const width = resolution.width;
        const height = resolution.height;

        this.bg.clear();
        this.bg.beginFill(0x0f131a);
        this.bg.drawRect(0, 0, width, height);
        this.bg.endFill();

        const centerX = width / 2;
        const centerY = height / 2;

        if (this.logo) {
            this.logo.position.set(centerX, centerY - 140);
            const maxWidth = 240;
            const scale = Math.min(1, maxWidth / this.logo.width);
            this.logo.scale.set(scale);
        }

        this.title.position.set(centerX, centerY + 10);
        this.subtitle.position.set(centerX, centerY + 60);
    }

    exit() {
        super.exit();

        if (this.container) {
            this.container.destroy({ children: true });
            this.container = null;
        }
    }
}

const manifest = {
    bundles: [
        {
            name: "logo",
            assets: [
                { alias: "logo", src: "assets/logo.svg" },
                { alias: "components.config", src: "assets/components.config.json" },
            ],
        },
    ],
};

Game.start({
    services: ServicesConfig,
    states: {
        sandbox: SandboxState,
    },
    initState: "sandbox",
    resources: {
        manifest,
    },
    layers: {
        layers: ["default"],
    },
    styles: {},
});
