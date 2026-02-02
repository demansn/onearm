import gsap from "gsap";
import { CSSPlugin } from "gsap/CSSPlugin";
import { PixiPlugin } from "gsap/PixiPlugin";
import * as PIXI from "pixi.js";

import { Service } from "./Service.js";

export class Plugins extends Service {
    init() {
        gsap.registerPlugin(PixiPlugin);

        PixiPlugin.registerPIXI(PIXI);
    }
}
