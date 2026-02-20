import { Graphics } from "pixi.js";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { CheckBoxComponent } from "../UI/CheckBoxComponent.js";
import { Button } from "../unified/Button.js";
import { SettingsSliderComponent } from "../UI/SettingsSliderComponent.js";
import { DotsGroup } from "../UI/DotsGroup.js";
import { ScrollBoxComponent } from "../UI/ScrollBoxComponent.js";
import services from "../../ServiceLocator.js";
import { ObjectFactory } from "../core/ObjectFactory.js";
import { BaseContainer } from "../core/BaseContainer.js";
import { Layout } from "../layout/Layout.js";
import { SpineAnimation } from "./SpineAnimation.js";
import { Rectangle } from "./Rectangle.js";
import { TextBlock } from "./TextBlock/TextBlock.js";
import { TextBlockXMLParser } from "./TextBlock/TextBlockXMLParser.js";
import { ZoneContainer } from "./ZoneContainer.js";
import { VariantsContainer } from "./VariantsContainer.js";
import {ProgressBar} from "@pixi/ui";

ObjectFactory.registerObjectFactory("Texts", ({ name, xml, ...rest }, factory) => {
    const xmlText = name ? factory.getTexture(name) : xml;
    const config = TextBlockXMLParser.parse(xmlText);
    const textBlock = new TextBlock({
        ...config,
        ...rest,
        images: services.get("resources").getAll(),
        styles: services.get("styles").getAll(),
    });

    return textBlock;
});

ObjectFactory.registerObjectFactory("TextBlock", (parameters, factory) => {
    return new TextBlock({
        ...parameters,
        images: services.get("resources").getAll(),
        styles: services.get("styles").getAll(),
    });
});

ObjectFactory.registerObjectFactory("Spine", ({ name }, factory) => {
    const spine = Spine.from({
        skeleton: `${name}Data`,
        atlas: `${name}Atlas`,
    });
    return spine;
});

// Keep "SuperContainer" string name for layout config backward compat
ObjectFactory.registerObjectFactory("SuperContainer", (parameters, factory) => {
    return new BaseContainer({
        ...parameters,
        screen: services.get("resizeSystem").getContext(),
    });
});

ObjectFactory.registerObjectConstructor("Graphics", Graphics);
ObjectFactory.registerObjectConstructor("DotsGroup", DotsGroup);
ObjectFactory.registerObjectConstructor("VariantsContainer", VariantsContainer);
ObjectFactory.registerObjectConstructor("SpineAnimation", SpineAnimation);
ObjectFactory.registerObjectConstructor("Rectangle", Rectangle);
ObjectFactory.registerObjectConstructor("ProgressBar", ProgressBar);
ObjectFactory.registerObjectConstructor("ScrollBoxComponent", ScrollBoxComponent);

// Keep string names for layout config backward compat
ObjectFactory.registerObjectFactory("AutoLayout", opts => new Layout({ ...opts, mode: "auto" }));
ObjectFactory.registerObjectFactory("FlexContainer", opts => new Layout({ ...opts, mode: "manual" }));
ObjectFactory.registerObjectFactory("ComponentContainer", opts => new BaseContainer(opts));
ObjectFactory.registerObjectFactory("AnimationButton", opts => new Button({
    ...opts,
    animation: { hover: 1.03, press: 0.95 },
    sounds: { press: "button_click", hover: "button_hover" },
}));

ObjectFactory.registerObjectFactory("CheckBoxComponent", options => {
    return new CheckBoxComponent({ ...options });
});

ObjectFactory.registerObjectFactory("GameZone", (parameters, factory, services) => {
    const resizeSystem = services.get("resizeSystem");
    const zone = resizeSystem.getContext().zone;

    return new ZoneContainer({ zone, zoneName: "game", ...parameters });
});

ObjectFactory.registerObjectFactory("FullScreenZone", (parameters, factory, services) => {
    const resizeSystem = services.get("resizeSystem");
    const zone = resizeSystem.getContext().zone;

    return new ZoneContainer({ zone, zoneName: "fullScreen", ...parameters });
});

ObjectFactory.registerObjectFactory("SaveZone", (parameters, factory, services) => {
    const resizeSystem = services.get("resizeSystem");
    const zone = resizeSystem.getContext().zone;

    return new ZoneContainer({ zone, zoneName: "save", ...parameters });
});
