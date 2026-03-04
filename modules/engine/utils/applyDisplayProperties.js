import { parseValue } from "./parseValue.js";

const BASIS_TYPES = {
    SCREEN: "fullScreen",
    SAFE_AREA: "save",
    GAME: "game",
    PARENT: "parent",
};

function getBasisSizes(zoneName, context, object) {
    const { zone, resolution } = context;
    switch (zoneName) {
        case BASIS_TYPES.SCREEN:
            return { width: zone.fullScreen.width, height: zone.fullScreen.height };
        case BASIS_TYPES.SAFE_AREA:
            return { width: zone.safe.width, height: zone.safe.height };
        case BASIS_TYPES.GAME:
            return { width: zone.game.width, height: zone.game.height };
        case BASIS_TYPES.PARENT:
            console.warn("applyDisplayProperties: zone 'parent' is not supported, falling back to resolution");
            return { width: resolution.width, height: resolution.height };
        default:
            return { width: resolution.width, height: resolution.height };
    }
}

function setPointValue(point, value, size = { width: 0, height: 0 }) {
    if (typeof value === "number") {
        point.set(value);
    } else if (Array.isArray(value)) {
        point.set(value[0] || 0, value[1] || 0);
    } else if (typeof value === "object") {
        if (value.x !== undefined) point.x = parseValue(value.x, size.width);
        if (value.y !== undefined) point.y = parseValue(value.y, size.height);
    }
}

/**
 * Apply display properties to a PIXI display object.
 * Handles zone-based positioning, anchor, scale, pivot, offset, and passthrough props.
 *
 * @param {object} object - PIXI display object
 * @param {object} properties - Display properties (x, y, scale, anchor, pivot, offset, zone, ...)
 * @param {object} [context] - ResizeSystem context with zone and resolution info
 */
export function applyDisplayProperties(object, properties = {}, context) {
    const { x, y, position, anchor, scale, pivot, offset, style, layer, params, name, ...other } = properties;
    const zone = properties.zone || "game";
    const basisSizes = context ? getBasisSizes(zone, context, object) : { width: 0, height: 0 };

    if (anchor !== undefined && object.anchor !== undefined) {
        setPointValue(object.anchor, anchor);
    }

    if (scale !== undefined) {
        setPointValue(object.scale, scale);
    }

    if (pivot !== undefined && object.pivot !== undefined) {
        setPointValue(object.pivot, pivot, object);
    }

    if (position) {
        setPointValue(object.position, position);
    } else {
        if (x !== undefined) {
            object.x = parseValue(x, basisSizes.width);
        }
        if (y !== undefined) {
            object.y = parseValue(y, basisSizes.height);
        }
    }

    if (offset) {
        if (offset.x !== undefined) {
            object.x += parseValue(offset.x, basisSizes.width);
        }
        if (offset.y !== undefined) {
            object.y += parseValue(offset.y, basisSizes.height);
        }
    }

    for (const key of Object.keys(other)) {
        if (object[key] !== undefined && other[key] !== undefined) {
            object[key] = other[key];
        }
    }
}
