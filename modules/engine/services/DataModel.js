import { EventEmitter } from "pixi.js";
import { Signal } from "typed-signals";
import { Service } from "./Service.js";

export class DataModel extends Service {
    emitter = new EventEmitter();
    data = {};
    _onChangeValue = new Signal();
    _signalsMap = {};

    async init({ options }) {
        const data = options || {};
        const { dontSaveKeys = [] } = data;
        this.dontSaveKeys = dontSaveKeys;
        Object.keys(data).forEach(key => {
            this.addSetter(key);
        });

        this.v = 2;

        for (const key in data) {
            this.data[key] = data[key];
        }

        this.loadFromLocalStorage();
        this.onChangeAny(this.saveToLocalStorage, this);
    }

    saveToLocalStorage() {
        const savedData = {};

        for (const key in this.data) {
            if (!this.dontSaveKeys.includes(key)) {
                savedData[key] = this.data[key];
            }
        }

        localStorage.setItem(this.dataKey, JSON.stringify(savedData));
    }

    get dataKey() {
        return "data" + this.v;
    }

    loadFromLocalStorage() {
        const data = JSON.parse(localStorage.getItem(this.dataKey));

        if (data) {
            this.setData(data);
        }
    }

    setData(data) {
        for (const key in data) {
            this[key] = data[key];
        }
    }

    getData() {
        return this.data;
    }

    on(key, callback, context) {
        this.emitter.on(key, callback, context);
    }

    onChangeAny(callback, context) {
        this.emitter.on("any", callback, context);
    }

    off(key, callback, context) {
        this.emitter.off(key, callback, context);
    }

    onChangeValue(key) {
        let signal = this._signalsMap[key];

        if (signal) {
            return signal;
        }

        signal = new Signal();
        this._signalsMap[key] = signal;

        this._onChangeValue.connect((changedKey, value, oldValue) => {
            if (changedKey === key) {
                signal.emit(value, oldValue);
            }
        });

        return signal;
    }

    addSetter(key, callback) {
        if (!this.data.hasOwnProperty(key)) {
            this.data[key] = undefined;
        }

        Object.defineProperty(this, key, {
            configurable: true,
            enumerable: true,
            get: () => this.data[key],
            set: value => {
                const oldValue = this.data[key];

                if (oldValue !== value) {
                    this.data[key] = value;
                    this._onChangeValue.emit(key, value, oldValue);
                    this.emitter.emit(key, value, oldValue);
                    this.emitter.emit("any", key, value, oldValue);
                }
            },
        });
    }
}
