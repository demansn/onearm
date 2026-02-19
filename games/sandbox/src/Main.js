import * as PIXI from "pixi.js";
import { Game, ServicesConfig } from "../../../modules/engine/index.js";

async function sandbox(scope, ctx) {
    const { app, resources, resizeSystem } = ctx;

    const container = new PIXI.Container();
    container.label = "sandboxContainer";
    app.root.addChild(container);

    scope.defer(() => container.destroy({ children: true }));

    const bg = new PIXI.Graphics();
    container.addChild(bg);

    const logoTexture = resources.get("logo");
    let logo = null;
    if (logoTexture) {
        logo = new PIXI.Sprite(logoTexture);
        logo.anchor.set(0.5);
        container.addChild(logo);
    }

    const title = new PIXI.Text({
        text: "Sandbox",
        style: {
            fontFamily: "Arial, sans-serif",
            fontSize: 56,
            fill: 0xffffff,
        },
    });
    title.anchor.set(0.5);
    container.addChild(title);

    const subtitle = new PIXI.Text({
        text: "Engine dev playground",
        style: {
            fontFamily: "Arial, sans-serif",
            fontSize: 24,
            fill: 0x9aa4b2,
        },
    });
    subtitle.anchor.set(0.5);
    container.addChild(subtitle);

    const layout = (context) => {
        if (!context) {
            return;
        }

        const { resolution } = context;
        const width = resolution.width;
        const height = resolution.height;

        bg.clear();
        bg.rect(0, 0, width, height);
        bg.fill(0x0f131a);

        const centerX = width / 2;
        const centerY = height / 2;

        if (logo) {
            logo.position.set(centerX, centerY - 140);
            const maxWidth = 240;
            const scale = Math.min(1, maxWidth / logo.width);
            logo.scale.set(scale);
        }

        title.position.set(centerX, centerY + 10);
        subtitle.position.set(centerX, centerY + 60);
    };

    container.onScreenResize = layout;
    layout(resizeSystem.getContext());

    await new Promise(() => {});
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
    flow: sandbox,
    resources: {
        manifest,
    },
    layers: {
        layers: ["default"],
    },
    styles: {},
});
