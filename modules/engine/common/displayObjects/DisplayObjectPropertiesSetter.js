export class DisplayObjectPropertiesSetter {
    constructor(parent, zone) {
        this.parent = parent;
        this.gameZone = zone.game;
        this.fullScreen = zone.fullScreen;
        this.save = zone.save;
    }

    updateZone(zone) {
        this.gameZone = zone.game;
        this.fullScreen = zone.fullScreen;
        this.save = zone.save;
    }

    set(displayObject, properties = {}) {
        const { x, y, position, anchor, scale, pivot, offset, style, ...other } = properties;

        if (anchor && displayObject.anchor !== undefined) {
            this.setPointValue(displayObject.anchor, anchor);
        }

        if (scale) {
            this.setPointValue(displayObject.scale, scale);
        }

        if (position) {
            this.setPointValue(displayObject.position, position);
        } else {
            if (x !== undefined) {
                if (typeof x === "string") {
                    displayObject.x = this.calculateValueExpression(
                        x,
                        displayObject.width,
                        this.parent.width,
                        this.gameZone.width,
                    );
                } else {
                    displayObject.x = x;
                }
            }

            if (y !== undefined) {
                if (typeof y === "string") {
                    displayObject.y = this.calculateValueExpression(
                        y,
                        displayObject.height,
                        this.parent.height,
                        this.gameZone.height,
                    );
                } else {
                    displayObject.y = y;
                }
            }
        }

        if (pivot && displayObject.pivot !== undefined) {
            if (pivot.x !== undefined) {
                if (typeof pivot.x === "string") {
                    displayObject.pivot.x = this.calculateValueExpression(
                        pivot.x,
                        displayObject.width,
                        this.parent.width,
                        this.gameZone.width,
                    );
                } else {
                    displayObject.pivot.x = pivot.x;
                }
            }

            if (pivot.y !== undefined) {
                if (typeof pivot.y === "string") {
                    displayObject.pivot.y = this.calculateValueExpression(
                        pivot.y,
                        displayObject.height,
                        this.parent.height,
                        this.gameZone.height,
                    );
                } else {
                    displayObject.pivot.y = pivot.y;
                }
            }
        }

        if (offset) {
            if (offset.x !== undefined) {
                if (typeof offset.x === "string") {
                    displayObject.x += this.calculateValueExpression(
                        offset.x,
                        displayObject.width,
                        this.parent.width,
                        this.gameZone.width,
                    );
                } else {
                    displayObject.x += offset.x;
                }
            }

            if (offset.y !== undefined) {
                if (typeof offset.y === "string") {
                    displayObject.y += this.calculateValueExpression(
                        offset.y,
                        displayObject.height,
                        this.parent.height,
                        this.gameZone.height,
                    );
                } else {
                    displayObject.y += offset.y;
                }
            }
        }

        other &&
            Object.keys(other).forEach(key => {
                if (displayObject[key] !== undefined && other[key] !== undefined) {
                    displayObject[key] = other[key];
                }
            });
    }

    calculateValueExpression(expression, displayObjectSize, parentSize, screenSize) {
        const [_, sign, relatively, value, percent] = /([-+]?)([sp]?)(\d+)(%?)/.exec(expression);
        let newValue = 0;
        let size = displayObjectSize;

        if (relatively) {
            size = relatively === "s" ? screenSize : parentSize;
        }

        const offset = (size * parseFloat(value)) / 100;

        newValue = sign === "-" ? -offset : offset;

        return newValue;
    }

    setPointValue(to, from) {
        if (from) {
            if (typeof from === "number") {
                to.set(from);
            } else if (from instanceof Array) {
                if (from.length === 2) {
                    to.set(...from);
                } else {
                    if (from[0] !== undefined && from[0] !== null) {
                        to.x = from[0];
                    }

                    if (from[1] !== undefined && from[1] !== null) {
                        to.y = from[1];
                    }
                }
            } else {
                if (from.x !== undefined) {
                    to.x = from.x;
                }

                if (from.y !== undefined) {
                    to.y = from.y;
                }
            }
        }
    }
}
