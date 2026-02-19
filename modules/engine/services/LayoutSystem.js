import { Service } from "./Service.js";

/**
 * LayoutSystem - система автоматического позиционирования объектов
 * Использует параметры ResizeSystem для адаптивного размещения
 */
export class LayoutSystem extends Service {
    static BASIS_TYPES = {
        SCREEN: "fullScreen",
        SAFE_AREA: "save",
        GAME: "game",
        PARENT: "parent",
    };

    static UNITS = {
        PERCENT: "%",
        PIXELS: "px",
    };

    constructor({ gameConfig, services, name, options = {} }) {
        super({ gameConfig, services, name, options });
    }
    async init() {
        this.resizeSystem = this.services.get("resizeSystem");
        this.resizeSystem.onResized.connect(this.update.bind(this), { order: 0 });
        this.rootContainer = this.services.get("app").root;
        this.rootContainer.on("childAdded", this.onAddedObject, this);
        this.rootContainer.on("childRemoved", this.onRemovedObject, this);
        this.containerners = [];
        this._lastContext = this.resizeSystem.getContext();
    }

    update(context) {
        if (!this.rootContainer) {
            return;
        }

        if (
            this._lastContext &&
            this._lastContext.mode === context.mode &&
            this._lastContext.screenWidth === context.screenWidth &&
            this._lastContext.screenHeight === context.screenHeight
        ) {
            return;
        }

        this._lastContext = { ...context };
        this._processContainer(this.rootContainer, context);
    }

    onAddedObject(object) {
        if (object.displayConfig) {
            this._applyLayout(object, this.resizeSystem.getContext());
        }

        if (object.children) {
            this._processContainer(object, this.resizeSystem.getContext());
        }

        if (object.children) {
            this.containerners.push(object);
            object.on("childAdded", this.onAddedObject, this);
            object.on("childRemoved", this.onRemovedObject, this);
        }
    }

    onRemovedObject(object) {
        this.containerners = this.containerners.filter(container => container !== object);
    }

    updateObject(object) {
        if (!object || !object.displayConfig) {
            return;
        }

        if (!this._lastContext) {
            return;
        }

        this._applyLayout(object, this.resizeSystem.getContext());
    }

    /**
     * Рекурсивная обработка контейнера
     */
    _processContainer(container, context) {
        if (!container || !container.children) {
            return;
        }

        if (container.onScreenResize) {
            container.onScreenResize(context);
        }

        for (const child of container.children) {
            if (child.onScreenResize) {
                child.onScreenResize(context);
            }

            if (child.displayConfig) {
                this._applyLayout(child, context);
            }

            if (child.children && child.children.length > 0) {
                this._processContainer(child, context);
            }
        }
    }

    /**
     * Применение layout конфигурации к объекту
     */
    _applyLayout(object, context) {
        // return
        const displayConfig = object.displayConfig;
        const config = { ...displayConfig };

        object.display = { ...config };

        if (!config) {
            return;
        }

        const { x, y, scale, anchor, pivot, zone = "game", ...rest } = config;

        const basisSizes = this._getBasisSizes(zone, context, object);

        if (object.label === "SliderBtn") {
            // debugger;
        }

        // Применяем позиционирование
        if (x !== undefined) {
            object.x = this._calculateValue(x, basisSizes.width, object.width);
        }

        if (y !== undefined) {
            object.y = this._calculateValue(y, basisSizes.height, object.height);
        }

        // Применяем точку вращения
        if (pivot !== undefined && object.pivot !== undefined) {
            this._setPointValue(object.pivot, pivot, object);
        }

        // Применяем масштаб
        if (scale !== undefined) {
            if (typeof scale === "number") {
                object.scale.set(scale);
            } else if (scale.x !== undefined || scale.y !== undefined) {
                if (scale.x !== undefined) {
                    object.scale.x = scale.x;
                }
                if (scale.y !== undefined) {
                    object.scale.y = scale.y;
                }
            }
        }

        // Применяем якорь
        if (anchor !== undefined && object.anchor !== undefined) {
            this._setPointValue(object.anchor, anchor);
        }
    }


    /**
     * Получение базовых размеров для расчетов
     */
    _getBasisSizes(zoneName, context, object) {
        const { zone, resolution } = context;
        switch (zoneName) {
            case LayoutSystem.BASIS_TYPES.SCREEN:
                return {
                    width: zone.fullScreen.width,
                    height: zone.fullScreen.height,
                };

            case LayoutSystem.BASIS_TYPES.SAFE_AREA:
                return {
                    width: zone.save.width,
                    height: zone.save.height,
                };

            case LayoutSystem.BASIS_TYPES.GAME:
                return {
                    width: zone.game.width,
                    height: zone.game.height,
                };

            case LayoutSystem.BASIS_TYPES.PARENT:
                const parent = object.parent;
                return parent ? parent.displayConfig.zone : zone;

            default:
                return {
                    width: resolution.width,
                    height: resolution.height,
                };
        }
    }

    /**
     * Расчет значения позиции/размера
     */
    _calculateValue(value, basisSize) {
        if (typeof value === "number") {
            return value;
        }

        if (typeof value === "string") {
            // Парсим строку вида "50%" или "100px"
            const match = value.match(/^([+-]?\d+(?:\.\d+)?)(%|px)?$/);
            if (!match) {
                return 0;
            }

            const [, number, unit] = match;
            const numValue = parseFloat(number);

            if (unit === LayoutSystem.UNITS.PERCENT) {
                return (basisSize * numValue) / 100;
            } else if (unit === LayoutSystem.UNITS.PIXELS || !unit) {
                return numValue;
            }
        }

        return 0;
    }

    /**
     * Установка значения точки (anchor, pivot)
     */
    _setPointValue(point, value, size = { width: 0, height: 0 }) {
        if (typeof value === "number") {
            point.set(value);
        } else if (Array.isArray(value)) {
            point.set(value[0] || 0, value[1] || 0);
        } else if (typeof value === "object") {
            if (value.x !== undefined) point.x = this._calculateValue(value.x, size.width);
            if (value.y !== undefined) point.y = this._calculateValue(value.y, size.height);
        }
    }
}
