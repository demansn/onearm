import { LayoutController } from "../LayoutController.js";

export class TabsBehavior extends LayoutController {
    init() {
        this._activeIndex = 0;
        this._navBehavior = null;
        this._panels = [];

        const { nav, content, tabs, activeIndex = 0 } = this.options;

        const navContainer = this.find(nav);
        this._navBehavior = navContainer?.behavior;

        const contentContainer = this.find(content);
        this._panels = tabs.map(name => contentContainer?.find?.(name));

        if (this._navBehavior) {
            this.connectSignal(this._navBehavior.onChange, i => this._showPanel(i));
        }

        this.setActive(activeIndex);
    }

    get activeIndex() { return this._activeIndex; }

    setActive(index) {
        this._activeIndex = index;
        if (this._navBehavior) this._navBehavior.setActive(index);
        this._showPanel(index);
    }

    _showPanel(index) {
        this._activeIndex = index;
        this._panels.forEach((p, i) => { if (p) p.visible = (i === index); });
    }

    getState() { return { activeIndex: this._activeIndex }; }
    setState({ activeIndex }) { if (activeIndex !== undefined) this.setActive(activeIndex); }
}
