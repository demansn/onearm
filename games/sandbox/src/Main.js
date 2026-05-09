import * as PIXI from "pixi.js";
import { Game, ServicesConfig, MultipleLabelAnchor } from "../../../modules/engine/index.js";

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

    const mlaTitle = new PIXI.Text({
        text: "YOU HAVE WON",
        style: { fontFamily: "Arial, sans-serif", fontSize: 28, fill: 0xffffff },
    });
    mlaTitle.anchor.set(0.5);
    const mlaCount = new PIXI.Text({
        text: "100",
        style: { fontFamily: "Arial, sans-serif", fontSize: 96, fill: 0xffd24a, fontWeight: "bold" },
    });
    mlaCount.anchor.set(0.5);
    const mlaLabel = new PIXI.Text({
        text: "FREE SPINS",
        style: { fontFamily: "Arial, sans-serif", fontSize: 28, fill: 0xffffff },
    });
    mlaLabel.anchor.set(0.5);

    const mlaVertical = new MultipleLabelAnchor({
        axis: "y",
        spacing: 8,
        anchor: "center",
        anyPivots: true,
    });
    mlaVertical.addChild(mlaTitle, mlaCount, mlaLabel);
    container.addChild(mlaVertical);

    const mlaHTitle = new PIXI.Text({
        text: "Congratulations on a very long winning streak today!",
        style: { fontFamily: "Arial, sans-serif", fontSize: 32, fill: 0xb7e4ff },
    });
    mlaHTitle.anchor.set(0, 0.5);
    const mlaHorizontal = new MultipleLabelAnchor({
        axis: "x",
        spacing: 0,
        anchor: "center",
        maxSize: 600,
        anyPivots: true,
    });
    mlaHorizontal.addChild(mlaHTitle);
    container.addChild(mlaHorizontal);

    const mlaFixedA = new PIXI.Text({
        text: "[A]",
        style: { fontFamily: "Arial, sans-serif", fontSize: 28, fill: 0xff8a65 },
    });
    mlaFixedA.anchor.set(0.5);
    const mlaFixedB = new PIXI.Text({
        text: "[B]",
        style: { fontFamily: "Arial, sans-serif", fontSize: 28, fill: 0xff8a65 },
    });
    mlaFixedB.anchor.set(0.5);

    const mlaFixed = new MultipleLabelAnchor({
        axis: "x",
        spacing: 16,
        anchor: "begin",
        fixedSize: 600,
        anyPivots: true,
    });
    mlaFixed.addChild(mlaFixedA, mlaFixedB);
    container.addChild(mlaFixed);

    const mlaFixedRule = new PIXI.Graphics();
    container.addChild(mlaFixedRule);

    window.__mla__ = {
        vertical: mlaVertical,
        horizontal: mlaHorizontal,
        fixed: mlaFixed,
        count: mlaCount,
        h: mlaHTitle,
    };

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

        mlaVertical.position.set(centerX, centerY + 220);
        mlaHorizontal.position.set(centerX, centerY + 380);

        mlaFixed.position.set(centerX, centerY + 440);
        mlaFixedRule.clear();
        mlaFixedRule.rect(centerX - 300, centerY + 425, 600, 30);
        mlaFixedRule.stroke({ color: 0x4a90e2, width: 1 });
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
