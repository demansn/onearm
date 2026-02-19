import { ServicesConfig } from "onearm";
import { manifest } from "./resources-manifest.js";
import { logo } from "../flows/logo.js";
import { PreloaderScene } from "../scenes/PreloaderScene.js";
import { HUDScene } from "../scenes/HUDScene.js";

export const GameConfig = {
    services: ServicesConfig,
    flow: logo,
    resources: { manifest },
    layers: {
        layers: ["background", "main", "ui"],
    },
    scenes: {
        PreloaderScene,
        HUDScene,
    },
    styles: {},
};
