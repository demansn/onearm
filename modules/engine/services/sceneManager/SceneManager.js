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

    /**
     * Add a scene to the manager.
     *
     * Scene config can be either a constructor function or an object:
     * - `MyScene` — plain Scene constructor
     * - `{ Scene: MyScene, children: { PlaceholderName: "ChildSceneName" } }` —
     *   Scene with declarative child scenes mounted into layout placeholders.
     *   Child scenes are automatically created and shown inside the placeholder
     *   containers, following ScreenLayout variant switches.
     *
     * @param {string|Function|Object} sceneName - Scene name, constructor, or config object
     * @param {Object} [options]
     * @param {Container} [options.root] - Parent container (defaults to app root)
     * @returns {Scene}
     */
    add(sceneName, options = {}) {
        const rawConfig =
            typeof sceneName === "string" ? this.getSceneConfig(sceneName) : sceneName;

        let SceneConstructor, sceneConfig = {};
        if (typeof rawConfig === "function") {
            SceneConstructor = rawConfig;
        } else if (rawConfig?.Scene) {
            SceneConstructor = rawConfig.Scene;
            sceneConfig = rawConfig;
        } else {
            console.error(`Scene with name ${sceneName} not found`);
            return;
        }

        const { root = this.root } = options;

        const scene = new SceneConstructor({
            name: sceneName,
            services: this.services,
            ...options,
            screen: this.resizeSystem.getContext(),
        });

        if (!this.get(scene.label)) {
            this.scenes[scene.label] = scene;
            root.addChild(scene);

            if (sceneConfig.children && scene.layout) {
                this.#mountChildren(scene, sceneConfig.children);
            }
        }

        return scene;
    }

    /**
     * Mount child scenes into parent scene placeholders.
     * @param {Scene} parentScene
     * @param {Object<string, string>} childrenConfig - { placeholderName: sceneName }
     */
    #mountChildren(parentScene, childrenConfig) {
        for (const [placeholder, childSceneName] of Object.entries(childrenConfig)) {
            const mount = parentScene.mountInPlaceholder(placeholder);
            this.show(childSceneName, { root: mount });
        }
    }

    get(name) {
        return this.scenes[name];
    }

    async show(sceneName, options = {}) {
        let scene = this.get(sceneName);

        if (!scene && this.getSceneConfig(sceneName)) {
            scene = this.add(sceneName, options);
        }

        if (!scene) {
            console.error(`Scene with name ${sceneName} not found`);
            return;
        }

        await scene.show(options);

        return scene;
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
