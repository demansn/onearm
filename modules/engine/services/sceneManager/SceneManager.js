import { Service } from "../Service.js";

import { Scene } from "./Scene.js";

export class SceneManager extends Service {
    constructor(params) {
        super(params);

        this.scenesConifg = {};

        if (this.gameConfig.scenes) {
            this.scenesConifg = this.gameConfig.scenes;
        }

        window.scenes = this;
    }

    getSceneConfig(name) {
        return this.scenesConifg[name];
    }

    init() {
        this.root = this.services.get("app").root;
        this.resizeSystem = this.services.get("resizeSystem");
        this.scenes = {};
    }

    add(sceneName, options = {}) {
        const SceneConstructor =
            typeof sceneName === "string" ? this.getSceneConfig(sceneName) : sceneName;

        if (!SceneConstructor) {
            console.error(`Scene with name ${sceneName} not found`);
            return;
        }

        const scene = new SceneConstructor({
            name: sceneName,
            ...options,
            screen: this.resizeSystem.getContext(),
        });
        const { root = this.root } = options;

        if (!this.get(scene.name)) {
            this.scenes[scene.name] = scene;

            root.addChild(scene);
        }

        return scene;
    }

    get(name) {
        return this.scenes[name];
    }

    show(sceneName, options = {}) {
        let scene = this.get(sceneName);

        if (!scene && this.getSceneConfig(sceneName)) {
            scene = this.add(sceneName, options);
        }

        if (!scene) {
            console.error(`Scene with name ${sceneName} not found`);
            return;
        }

        return scene.show(options);
    }

    hide(name) {
        if (!this.scenes || !this.scenes[name]) {
            console.error(`Scene with name ${name} not found`);
            return;
        }

        const scene = this.scenes[name];
        scene.hide();
    }

    remove(name) {
        if (!this.scenes || !this.scenes[name]) {
            console.error(`Scene with name ${name} not found`);
            return;
        }

        const scene = this.scenes[name];
        scene.destroy();
        delete this.scenes[name];
    }
}
