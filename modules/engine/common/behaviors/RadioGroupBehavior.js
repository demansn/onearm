import { LayoutController } from "../LayoutController.js";
import { Signal } from "typed-signals";

export class RadioGroupBehavior extends LayoutController {
    init() {
        this.onChange = new Signal();
        this._activeIndex = 0;
        this._items = [];

        const { items, activeIndex = 0 } = this.options;
        this._items = items.map(name => this.find(name));

        this._items.forEach((item, i) => {
            if (item?.onChange) {
                this.connectSignal(item.onChange, () => this.setActive(i));
            }
        });

        this.setActive(activeIndex);
    }

    get activeIndex() { return this._activeIndex; }

    setActive(index) {
        this._activeIndex = index;
        this._items.forEach((item, i) => {
            if (item?.setState) item.setState(i === index);
        });
        this.onChange.emit(index);
    }

    getState() { return { activeIndex: this._activeIndex }; }
    setState({ activeIndex }) { if (activeIndex !== undefined) this.setActive(activeIndex); }
}
