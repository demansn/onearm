import {Signal} from "typed-signals";

export class ValueSelector {
    constructor({resources, values = [], initialValueIndex = 0, loop = false}) {
        this.leftButton = resources.find('LeftButton');
        this.rightButton = resources.find('RightButton');
        this.valueText = resources.find('value');

        this.values = values;
        this.currentValueIndex = initialValueIndex;
        this.loop = loop;
        this.leftButton.onPress.connect(this.handlePressLeft.bind(this));
        this.rightButton.onPress.connect(this.handlePressRight.bind(this));
        this.onChange = new Signal();
        this.setValueIndex(initialValueIndex);
    }

    set enabled(value) {
        this.leftButton.enabled = value;
        this.rightButton.enabled = value;
    }

    setIndex(index) {
        if (index < 0 || index >= this.values.length) {
            console.warn('Index out of bounds:', index);
            return;
        }
        this.setValueIndex(index);
    }

    handlePressLeft() {
        this.currentValueIndex -= 1;
        if (this.currentValueIndex < 0) {
            if (this.loop) {
                this.currentValueIndex = this.values.length - 1;
            } else {
                this.currentValueIndex = 0;
            }
        }
        this.setValueIndex(this.currentValueIndex);
        this.onChange.emit(this.values[this.currentValueIndex]);
    }

    handlePressRight() {
        this.currentValueIndex += 1;
        if (this.currentValueIndex >= this.values.length) {
            if (this.loop) {
                this.currentValueIndex = 0;
            } else {
                this.currentValueIndex = this.values.length - 1;
            }
        }
        this.setValueIndex(this.currentValueIndex);
        this.onChange.emit(this.values[this.currentValueIndex]);
    }

    setValue(value) {
        const index = this.values.indexOf(value);
        if (index !== -1) {
            this.setValueIndex(index);
        } else {
            console.warn('Value not found in values array:', value);
        }
    }

    setValueIndex(index) {
        this.valueText.text = this.values[index].toString();
        this.currentValueIndex = index;

        if (!this.loop) {
            this.leftButton.enabled = index > 0;
            this.rightButton.enabled = index < this.values.length - 1;
        }
    }
}
