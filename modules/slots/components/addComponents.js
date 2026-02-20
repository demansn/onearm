import { ObjectFactory } from "../../engine/index.js";
import { Button } from "../../engine/common/unified/Button.js";
import { CheckBoxComponent } from "../../engine/index.js";
import { SpineAnimation } from "../../engine/index.js";


import { BottomPanelBackground } from "./ui/BottomPanelBackground.js";
import { Sprite } from "pixi.js";

ObjectFactory.registerObjectFactory("MinusButton", options => {
    return new Button({ ...options, image: "MinusButtonDefault", animation: { hover: 1.03, press: 0.95 }, sounds: { press: "button_click", hover: "button_hover" } });
});
ObjectFactory.registerObjectFactory("PlusButton", options => {
    return new Button({ ...options, image: "PlusButtonDefault", animation: { hover: 1.03, press: 0.95 }, sounds: { press: "button_click", hover: "button_hover" } });
});
ObjectFactory.registerObjectFactory("CloseButton", options => {
    return new Button({ ...options, image: "ClosButtonDefault", animation: { hover: 1.03, press: 0.95 }, sounds: { press: "button_click", hover: "button_hover" } });
});
ObjectFactory.registerObjectFactory("CancelButton", options => {
    return new Button({ ...options, image: "ClosButtonDefault", animation: { hover: 1.03, press: 0.95 }, sounds: { press: "button_click", hover: "button_hover" } });
});
ObjectFactory.registerObjectFactory("OkButton", options => {
    return new Button({ ...options, image: "ConfirmButton", animation: { hover: 1.03, press: 0.95 }, sounds: { press: "button_click", hover: "button_hover" } });
});

ObjectFactory.registerObjectFactory("CheckBox", options => {
    return new CheckBoxComponent({ ...options, checked: "RectangleOn", unchecked: "RectangleOff" });
});

ObjectFactory.registerObjectFactory("SymbolIcon", ({ name }, mather, services) => {
    const resources = services.get("resources");

    return  new Sprite(resources.get(name));
});

ObjectFactory.registerObjectFactory("SymbolMultiplier", ({ multiplier }, mather, services) => {
    const layouts = services.get("layouts");
    const layout = layouts.build("SymbolMultiplier");

    layout.get("text").text = `X${multiplier}`;

    return  layout;
});

// ObjectFactory.registerObjectFactory("BottomPanelBackground", (options, mather, services) => {
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
