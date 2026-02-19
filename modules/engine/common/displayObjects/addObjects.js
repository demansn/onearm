import { Graphics } from "pixi.js";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { CheckBoxComponent } from "../UI/CheckBoxComponent.js";
import { AnimationButton } from "../UI/AnimationButton.js";
import { SettingsSliderComponent } from "../UI/SettingsSliderComponent.js";
import { DotsGroup } from "../UI/DotsGroup.js";
import { ScrollBoxComponent } from "../UI/ScrollBoxComponent.js";
import services from "../../ServiceLocator.js";
import { Mather } from "./Mather.js";
import { SpineAnimation } from "./SpineAnimation.js";
import { AutoLayout } from "./AutoLayout.js";
import { FlexContainer } from "./FlexContainer.js";
import { SuperContainer } from "./SuperContainer.js";
import { ComponentContainer } from "./ComponentContainer.js";
import { Rectangle } from "./Rectangle.js";
import { TextBlock } from "./TextBlock/TextBlock.js";
import { TextBlockXMLParser } from "./TextBlock/TextBlockXMLParser.js";
import { ZoneContainer } from "./ZoneContainer.js";
import { VariantsContainer } from "./VariantsContainer.js";
import {ProgressBar} from "@pixi/ui";

Mather.registerObjectFactory("Texts", ({ name, xml, ...rest }, mather) => {
    const xmlText = name ? mather.getTexture(name) : xml;
    const config = TextBlockXMLParser.parse(xmlText);
    const textBlock = new TextBlock({
        ...config,
        ...rest,
        images: services.get("resources").getAll(),
        styles: services.get("styles").getAll(),
    });

    return textBlock;
});

Mather.registerObjectFactory("TextBlock", (parameters, mather) => {
    return new TextBlock({
        ...parameters,
        images: services.get("resources").getAll(),
        styles: services.get("styles").getAll(),
    });
});

Mather.registerObjectFactory("Spine", ({ name }, mather) => {
    const spine = Spine.from({
        skeleton: `${name}Data`,
        atlas: `${name}Atlas`,
    });
    return spine;
});

Mather.registerObjectFactory("SuperContainer", (parameters, mather) => {
    return new SuperContainer({
        ...parameters,
        screen: services.get("resizeSystem").getContext(),
    });
});

Mather.registerObjectConstructor("Graphics", Graphics);
Mather.registerObjectConstructor("DotsGroup", DotsGroup);
Mather.registerObjectConstructor("VariantsContainer", VariantsContainer);
Mather.registerObjectConstructor("SpineAnimation", SpineAnimation);
Mather.registerObjectConstructor("AutoLayout", AutoLayout);
Mather.registerObjectConstructor("ComponentContainer", ComponentContainer);
Mather.registerObjectConstructor("FlexContainer", FlexContainer);
Mather.registerObjectConstructor("Rectangle", Rectangle);
Mather.registerObjectConstructor("AnimationButton", AnimationButton);
Mather.registerObjectConstructor("ProgressBar", ProgressBar);
Mather.registerObjectConstructor("ScrollBoxComponent", ScrollBoxComponent);

Mather.registerObjectFactory("CheckBoxComponent", options => {
    return new CheckBoxComponent({ ...options });
});

Mather.registerObjectFactory("GameZone", (parameters, mather, services) => {
    const resizeSystem = services.get("resizeSystem");
    const zone = resizeSystem.getContext().zone;

    return new ZoneContainer({ zone, zoneName: "game", ...parameters });
});

Mather.registerObjectFactory("FullScreenZone", (parameters, mather, services) => {
    const resizeSystem = services.get("resizeSystem");
    const zone = resizeSystem.getContext().zone;

    return new ZoneContainer({ zone, zoneName: "fullScreen", ...parameters });
});

Mather.registerObjectFactory("SaveZone", (parameters, mather, services) => {
    const resizeSystem = services.get("resizeSystem");
    const zone = resizeSystem.getContext().zone;

    return new ZoneContainer({ zone, zoneName: "save", ...parameters });
});
