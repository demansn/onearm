import { DataModel } from "../services/DataModel.js";
import { ResourceLoader } from "../services/ResourceLoader.js";
import { Plugins } from "../services/Plugins.js";
import { PixiGsapPlugin } from "../services/PixiGsapPlugin.js";
import { SpineGsapPlugin } from "../services/SpineGsapPlugin.js";
import { SavedData } from "../services/SavedData.js";
import { Styles } from "../services/Styles.js";
import { RendererSystem } from "../services/RendererSystem.js";
import { ResizeSystem } from "../services/ResizeSystem.js";
import { LayoutSystem } from "../services/LayoutSystem.js";
import { SceneManager } from "../services/sceneManager/SceneManager.js";
import { CurrencyFormatter } from "../services/CurrencyFormatter.js";
import { GameLayers } from "../services/GameLayers.js";
import { LayoutBuilder } from "../services/LayoutBuilder.js";
import { DebugSystem } from "../services/DebugSystem.js";
import AudioManager from "../services/AudioManager.js";
import { KeyboardService } from "../services/KeyboardService.js";
import { FullscreenService } from "../services/FullscreenService.js";
import { ControllerStore } from "../flow/ControllerStore.js";
import { SuperContainer } from "../common/displayObjects/SuperContainer.js";

export const ServicesConfig = {
    gameConfig: { Service: ({ gameConfig }) => gameConfig },
    data: { Service: DataModel },
    plugins: { Service: Plugins },
    resources: { Service: ResourceLoader },
    saved: { Service: SavedData },
    styles: { Service: Styles },
    app: { Service: RendererSystem },
    resizeSystem: { Service: ResizeSystem },
    layoutSystem: { Service: LayoutSystem },
    scenes: { Service: SceneManager },
    currencyFormatter: { Service: CurrencyFormatter },
    layers: { Service: GameLayers },
    pixiGsap: { Service: PixiGsapPlugin },
    spineGsap: { Service: SpineGsapPlugin },
    layouts: { Service: LayoutBuilder },
    debugSystem: { Service: DebugSystem },
    audio: { Service: AudioManager },
    keyboard: { Service: KeyboardService },
    fullscreen: { Service: FullscreenService },
    controllerStore: { Service: ControllerStore },
    superContainerInit: {
        Service: ({ services }) => {
            SuperContainer.textures = services.get("resources");
            SuperContainer.styles = services.get("styles");
            SuperContainer.layers = services.get("layers");
            SuperContainer.zone = services.get("resizeSystem").getContext().zone;
            SuperContainer.data = services.get("data");
            SuperContainer.assets = services.get("resources");
            SuperContainer.rendererSize = {
                width: services.get("app").width,
                height: services.get("app").height,
            };
        },
    },
};
