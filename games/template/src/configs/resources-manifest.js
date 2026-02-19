export const manifest = {
    bundles: [
        {
            name: "logo",
            assets: [
                { alias: "config", src: "assets/config.json" },
                { alias: "components.config", src: "assets/components.config.json" },
            ],
        },
        {
            name: "preloader",
            assets: [],
        },
        {
            name: "main",
            assets: [],
        },
    ],
};
