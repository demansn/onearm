import { PresentationAct } from "./PresentationAct.js";

export class StickySymbolsAct extends PresentationAct {
    constructor({ result, reelsScene }) {
        super({ skipStep: false });
        this.result = result;
        this.reelsScene = reelsScene;
    }

    skip() {
        this.reelsScene.setStickySymbols(this.result.stickySymbols || []);
    }

    action() {
        this.reelsScene.setStickySymbols(this.result.stickySymbols || []);
    }
}
