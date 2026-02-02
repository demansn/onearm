import { Sprite, TextStyle, Text, AnimatedSprite } from "pixi.js";

import services from "../../ServiceLocator.js";
import { DisplayObjectPropertiesSetter } from "./DisplayObjectPropertiesSetter.js";

export class Mather {
    static objectsFactoriesByNames = {};
    static objectsFactoriesConfigs = {};
    static registerObjectFactory(name, factory) {
        Mather.objectsFactoriesByNames[name] = factory;
    }

    static registerObjectConstructor(name, constructor) {
        Mather.objectsFactoriesByNames[name] = properties => new constructor(properties);
    }

    static registerObjectConstructors(objects) {
        for (const [name, constructor] of Object.entries(objects)) {
            Mather.registerObjectConstructor(name, constructor);
        }
    }

    static registerObjectFactoryConfig(name, config) {
        Mather.objectsFactoriesConfigs[name] = config;
    }

    constructor(parent, textures, styles, layers, zone) {
        this.parent = parent;
        this.textures = textures;
        this.styles = styles;
        this.layers = layers;

        this.properties = new DisplayObjectPropertiesSetter(this.parent, zone);
    }

    buildDisplayObject(object, properties = {}) {
        const { layer, params, ...display } = properties;

        const factory = this.getObjectFactory(object);
        const displayObject = factory(params || display, this, services);

        if (layer) {
            displayObject.parentLayer = this.layers.get(layer);
        }

        displayObject.name = properties.name;

        return displayObject;
    }

    createObject(object, properties = {}) {
        const displayObject = this.buildDisplayObject(object, properties);
        const { layer, params, ...display } = properties;


        if (display) {
            displayObject.displayConfig = display;
            displayObject.display = display;
        }
        services.get("layoutSystem").updateObject(displayObject);


        this.addDisplayObject(displayObject);
        this.properties.set(displayObject, display);

        return displayObject;
    }

    getObjectFactory(object) {
        let factory =
            object instanceof Function
                ? params => new object(params)
                : Mather.objectsFactoriesByNames[object];

        if (!factory) {
            if (object === "Sprite") {
                factory = params =>
                    new Sprite(this.getTexture(params.texture || params.name), params);
            }
            if (object === "Text") {
                factory = ({ style, text }) => {
                    if (style) {
                        if (typeof style === "string" && this.styles.get(style)) {
                            style = this.styles.get(style);
                        } else if (!(style instanceof TextStyle)) {
                            style = new TextStyle(style);
                        }
                    }

                    const textObject = new Text(text, style);
                    textObject.resolution = 2;
                    return textObject;
                };
            } else if (this.getTexture(object)) {
                factory = params => new Sprite(this.getTexture(object), params);
            }
        }

        return factory;
    }

    getStyle(style) {
        return this.styles.get(style);
    }

    getTexture(texture) {
        return this.textures.get(texture);
    }

    addAndSetProperties(displayObject, properties = {}) {
        const { layer, layout, ...rest } = properties;

        displayObject.layout = layout;

        this.addDisplayObject(displayObject, rest);

        this.properties.set(displayObject, rest);

        if (layer) {
            displayObject.parentLayer = this.layers.get(layer);
        }

        return displayObject;
    }

    addDisplayObject(displayObject) {
        this.parent.addChild(displayObject);
    }
}
