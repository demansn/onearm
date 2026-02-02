import { Mather } from "@slot/engine";
import { AnimationButton } from "@slot/engine";
import { CheckBoxComponent } from "@slot/engine";
import { SpineAnimation } from "@slot/engine";
import { SuperContainer } from "@slot/engine";

import { BottomPanelBackground } from "./ui/BottomPanelBackground.js";
import { Sprite } from "pixi.js";

Mather.registerObjectFactory("MinusButton", options => {
    return new AnimationButton({ ...options, image: "MinusButtonDefault" });
});
Mather.registerObjectFactory("PlusButton", options => {
    return new AnimationButton({ ...options, image: "PlusButtonDefault" });
});
Mather.registerObjectFactory("CloseButton", options => {
    return new AnimationButton({ ...options, image: "ClosButtonDefault" });
});
Mather.registerObjectFactory("CancelButton", options => {
    return new AnimationButton({ ...options, image: "ClosButtonDefault" });
});
Mather.registerObjectFactory("OkButton", options => {
    return new AnimationButton({ ...options, image: "ConfirmButton" });
});

Mather.registerObjectFactory("CheckBox", options => {
    return new CheckBoxComponent({ ...options, checked: "RectangleOn", unchecked: "RectangleOff" });
});

Mather.registerObjectFactory("SymbolIcon", ({ name }, mather, services) => {
    const resources = services.get("resources");

    return  new Sprite(resources.get(name));
});

Mather.registerObjectFactory("SymbolMultiplier", ({ multiplier }, mather, services) => {
    const layouts = services.get("layouts");
    const layout = layouts.build("SymbolMultiplier");

    layout.get("text").text = `X${multiplier}`;

    return  layout;
});

// Mather.registerObjectFactory("BottomPanelBackground", (options, mather, services) => {
//     const resizeSystem = services.get("resizeSystem");
//     const fullScreen = resizeSystem.getContext().zone.fullScreen;
//     const mode = resizeSystem.getContext().mode;

//     debugger;

//     return new BottomPanelBackground({
//         ...options,
//         mode,
//         borderColor: 0xf99911,
//         borderWidth: 1,
//         color: 0x000000,
//         alpha: 0.4,
//         width: fullScreen.width,
//         height: { default: 155, landscape: 200, portrait: 300 },
//     });
// });
