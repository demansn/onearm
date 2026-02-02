import { Assets } from "pixi.js";

import { Service } from "./Service.js";

export class ResourceLoader extends Service {
    async init() {
        this.resources = {};
        this.loader = Assets;
        this.manifest = this.options.manifest;

        this.keys = [];

        for (const bundle of this.manifest.bundles) {
            for (const asset of bundle.assets) {
                this.keys.push(asset.alias);
            }
        }

        await this.loader.init({ manifest: this.manifest });
        await this.load("logo");
        window.resources = this;
    }

    get(name) {
        return this.loader.get(name);
    }

    getAll() {
        const all = {};
        for (const key of this.keys) {
            all[key] = this.loader.get(key);
        }
        return all;
    }

    async load(bundleName, { onLoaded = () => {}, onProgress = () => {} } = {}) {
        await this.loader.loadBundle(bundleName, onProgress);

        onLoaded();
    }
}
