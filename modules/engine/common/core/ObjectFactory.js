import { Sprite, TextStyle, Text, AnimatedSprite, FillGradient } from "pixi.js";

import services from "../../ServiceLocator.js";
import { DisplayObjectPropertiesSetter } from "../displayObjects/DisplayObjectPropertiesSetter.js";

/**
 * Convert v7 TextStyle properties to v8 format
 */
function convertV7TextStyle(style) {
    const s = { ...style };

    // stroke + strokeThickness -> stroke: { color, width }
    if (s.strokeThickness || (s.stroke && typeof s.stroke !== "object")) {
        const color = s.stroke;
        const width = s.strokeThickness || 0;
        delete s.strokeThickness;
        if (width > 0 && color) {
            s.stroke = { color, width };
        } else {
            delete s.stroke;
        }
    }

    // fill gradient: fill (array) + fillGradientStops -> FillGradient
    if (s.fillGradientStops && Array.isArray(s.fill)) {
        const colors = s.fill;
        const stops = s.fillGradientStops;
        const colorStops = colors.map((color, i) => ({
            offset: stops[i] ?? i / (colors.length - 1),
            color,
        }));
        s.fill = new FillGradient({
            type: "linear",
            start: { x: 0.5, y: 0 },
            end: { x: 0.5, y: 1 },
            colorStops,
        });
        delete s.fillGradientStops;
        delete s.fillGradientType;
    }

    // dropShadow boolean -> object
    if (typeof s.dropShadow === "boolean") {
        if (s.dropShadow) {
            s.dropShadow = {
                alpha: s.dropShadowAlpha ?? 1,
                angle: s.dropShadowAngle ?? Math.PI / 6,
                blur: s.dropShadowBlur ?? 0,
                color: s.dropShadowColor ?? "black",
                distance: s.dropShadowDistance ?? 5,
            };
        } else {
            delete s.dropShadow;
        }
        delete s.dropShadowAlpha;
        delete s.dropShadowAngle;
        delete s.dropShadowBlur;
        delete s.dropShadowColor;
        delete s.dropShadowDistance;
    }

    return s;
}

/**
 * ObjectFactory - creates display objects from configuration.
 * Manages texture/style resolution, factory registry, and property application.
 * Previously known as Mather.
 */
export class ObjectFactory {
    static objectsFactoriesByNames = {};
    static objectsFactoriesConfigs = {};

    static registerObjectFactory(name, factory) {
        ObjectFactory.objectsFactoriesByNames[name] = factory;
    }

    static registerObjectConstructor(name, constructor) {
        ObjectFactory.objectsFactoriesByNames[name] = properties => new constructor(properties);
    }

    static registerObjectConstructors(objects) {
        for (const [name, constructor] of Object.entries(objects)) {
            ObjectFactory.registerObjectConstructor(name, constructor);
        }
    }

    static registerObjectFactoryConfig(name, config) {
        ObjectFactory.objectsFactoriesConfigs[name] = config;
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

        displayObject.label = properties.name;

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
                : ObjectFactory.objectsFactoriesByNames[object];

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
                            style = convertV7TextStyle(style);
                            style = new TextStyle(style);
                        }
                    }

                    const textObject = new Text({ text, style });
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
