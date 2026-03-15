import { Game, ServicesConfig } from "onearm";
import { manifest } from "game-manifest";
import { spinePreviewFlow } from "./spinePreviewFlow.js";

Game.start({
    services: ServicesConfig,
    flow: spinePreviewFlow,
    resources: { manifest },
    layers: { layers: ["default"] },
    styles: {},
});
