import { Sprite, TextStyle, Text, AnimatedSprite, FillGradient, FillPattern } from "pixi.js";

import { getEngineContext } from "./EngineContext.js";
import { applyDisplayProperties } from "../../utils/applyDisplayProperties.js";

function angleToBasisPoints(angleDeg) {
    const rad = (angleDeg * Math.PI) / 180;
    return {
        start: { x: 0.5 - Math.sin(rad) * 0.5, y: 0.5 + Math.cos(rad) * 0.5 },
        end: { x: 0.5 + Math.sin(rad) * 0.5, y: 0.5 - Math.cos(rad) * 0.5 },
    };
}

function resolveFill(value, factory) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;

    if (value.type === "linear-gradient") {
        const { angle = 180, colorStops } = value;
        const { start, end } = angleToBasisPoints(angle);
        return new FillGradient({ type: "linear", start, end, colorStops });
    }

    if (value.type === "pattern") {
        const texture = factory.getTexture(value.spriteName);
        if (!texture) {
            console.warn(`resolveFill: texture "${value.spriteName}" not found, using white fallback`);
            return "#ffffff";
        }
        return new FillPattern(texture, "repeat");
    }

    return value;
}

/**
 * Convert v7 TextStyle properties to v8 format.
 * Also hydrates the structured FillGradient descriptor emitted by the Figma exporter.
 */
export function convertV7TextStyle(style, factory) {
    const s = { ...style };

    if (s.arcRadius !== undefined) {
        console.warn("convertV7TextStyle: arcRadius is not supported, ignoring");
        delete s.arcRadius;
    }

    // stroke + strokeThickness/strokeWidth -> stroke: { color, width }
    if (s.strokeThickness || s.strokeWidth || (s.stroke && typeof s.stroke !== "object")) {
        const color = s.stroke;
        const width = s.strokeThickness || s.strokeWidth || 0;
        delete s.strokeThickness;
        delete s.strokeWidth;
        if (width > 0 && color) {
            s.stroke = { color, width };
        } else {
            delete s.stroke;
        }
    }

    // Structured FillGradient descriptor (from Figma exporter):
    // { type: 'linear' | 'radial', ...FillGradient config, colorStops: [...] }
    if (
        s.fill &&
        typeof s.fill === "object" &&
        !Array.isArray(s.fill) &&
        !(s.fill instanceof FillGradient) &&
        Array.isArray(s.fill.colorStops) &&
        (s.fill.type === "linear" || s.fill.type === "radial" || !s.fill.type)
    ) {
        s.fill = new FillGradient(s.fill);
    }

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
    } else {
        s.fill = resolveFill(s.fill, factory);
    }

    if (s.stroke && typeof s.stroke === "object" && s.stroke.fill) {
        const resolved = resolveFill(s.stroke.fill, factory);
        const { fill: _drop, ...rest } = s.stroke;
        if (resolved instanceof FillGradient || resolved instanceof FillPattern) {
            s.stroke = { ...rest, fill: resolved };
        } else {
            s.stroke = { ...rest, color: resolved };
        }
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
    }

    buildDisplayObject(object, properties = {}) {
        const { layer, params, ...display } = properties;

        const factory = this.getObjectFactory(object);
        const displayObject = factory(params || display, this, getEngineContext().services);

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
        }

        this.addDisplayObject(displayObject);
        const context = getEngineContext().services.get("resizeSystem")?.getContext();
        applyDisplayProperties(displayObject, display, context);

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
                            style = convertV7TextStyle(style, this);
                            style = new TextStyle(style);
                        }
                    }

                    const textObject = new Text({ text, style });
                    textObject.resolution = Math.min(window.devicePixelRatio || 2, 3);
                    return textObject;
                };
            } else if (this.hasTexture(object)) {
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

    hasTexture(texture) {
        return typeof this.textures.has === "function"
            ? this.textures.has(texture)
            : !!this.textures.get(texture);
    }

    addDisplayObject(displayObject) {
        this.parent.addChild(displayObject);
    }
}
