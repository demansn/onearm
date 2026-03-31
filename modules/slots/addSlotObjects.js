import { LayoutBuilder } from "../engine/services/LayoutBuilder.js";
import { ObjectFactory } from "../engine/common/core/ObjectFactory.js";
import { Reels } from "./reels/Reels.js";
import { ReelsSymbols } from "./reels/ReelsSymbols.js";
import { ObjectFactory } from "../engine/common/core/ObjectFactory.js";

ObjectFactory.registerObjectFactory("SymbolMultiplier", ({ multiplier }, factory, services) => {
    const object = services.get("layouts").build("SymbolMultiplier");

    object.text = `X${multiplier}`;

    return object;
});

LayoutBuilder.registerLayoutBuilder("Reels", function (config) {
    const { name, reels: reelsGeometry } = config;

    const symbols = this.gameConfig?.symbols;
    if (!symbols) {
        throw new Error("Reels builder requires gameConfig.symbols");
    }

    const reelsSymbols = new ReelsSymbols(symbols);
    const reels = new Reels({ ...reelsGeometry, reelsSymbols });
    reels.label = name;

    return reels;
});
