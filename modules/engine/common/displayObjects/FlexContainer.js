import { SuperContainer } from "./SuperContainer.js";

/**
 * FlexContainer - контейнер для индивидуального позиционирования дочерних элементов
 * на основе их свойств display с поддержкой процентных значений
 */
export class FlexContainer extends SuperContainer {
    /**
     * @param {Object} options - Параметры для настройки FlexContainer
     * @param {string} [options.name='FlexContainer'] - Имя контейнера
     * @param {Object|string} [options.size='auto'] - Размер контейнера
     * @param {number} [options.size.width] - Ширина контейнера
     * @param {number} [options.size.height] - Высота контейнера
     * @param {Object} [options.areaAlign={x: 'left', y: 'top'}] - Выравнивание всего контейнера
     * @param {string} [options.areaAlign.x='left'] - Горизонтальное выравнивание: 'left', 'center', 'right'
     * @param {string} [options.areaAlign.y='top'] - Вертикальное выравнивание: 'top', 'center', 'bottom'
     */
    constructor({
        name = "FlexContainer",
        size = "auto",
        areaAlign = { x: "left", y: "top" },
        ...props
    } = {}) {
        super(props);

        this.label = name;
        this.size = size;
        this.areaAlign = areaAlign;

        this.calculatedWidth = 0;
        this.calculatedHeight = 0;
    }

    setSize(width, height) {
        this.size = { width, height };
        this.layout();
    }

    /**
     * Вычисляет размеры и позиции всех дочерних элементов
     */
    layout() {
        const visibleChildren = this.children.filter(child => child.visible);

        if (visibleChildren.length === 0) {
            this.calculatedWidth = 0;
            this.calculatedHeight = 0;
            return;
        }

        // Определяем размеры контейнера
        const { containerWidth, containerHeight } = this._getContainerSize(visibleChildren);

        this.calculatedWidth = containerWidth;
        this.calculatedHeight = containerHeight;

        // Позиционируем каждый дочерний элемент
        visibleChildren.forEach(child => {
            this._positionChild(child, containerWidth, containerHeight);
        });

        // Применяем выравнивание всего контейнера
        this._applyAreaAlignment();
    }

    /**
     * Определяет размеры контейнера
     */
    _getContainerSize(children) {
        let containerWidth, containerHeight;

        if (this.size === "auto") {
            // Вычисляем размер по содержимому
            containerWidth = Math.max(...children.map(child => child.x + child.width));
            containerHeight = Math.max(...children.map(child => child.y + child.height));
        } else {
            containerWidth = this.size.width || 0;
            containerHeight = this.size.height || 0;
        }

        return { containerWidth, containerHeight };
    }

    /**
     * Позиционирует один дочерний элемент
     */
    _positionChild(child, containerWidth, containerHeight) {
        const { align = { x: "left", y: "top" }, offset = {} } = child.display || child;
        let childSize = { width: child.width, height: child.height };

        if (child.label && child.label.endsWith("_ph")) {
            childSize = { width: 0, height: 0 };
        }

        // Вычисляем базовую позицию
        const baseX = this._calculatePosition(align.x, containerWidth, childSize.width, "x");
        const baseY = this._calculatePosition(align.y, containerHeight, childSize.height, "y");
        // Применяем offset
        const { offsetX, offsetY } = this._calculateOffset(offset, containerWidth, containerHeight);

        if (baseX !== undefined) {
            child.x = baseX + offsetX;
        }

        if (baseY !== undefined) {
            child.y = baseY + offsetY;
        }
    }

    /**
     * Вычисляет базовую позицию элемента
     */
    _calculatePosition(align, containerSize, childSize, axis) {
        // Если это число
        if (typeof align === "number") {
            return align;
        }

        // Если это процент
        if (typeof align === "string" && align.endsWith("%")) {
            const percent = parseFloat(align) / 100;
            return containerSize * percent - childSize * percent;
        }

        const childCenter = childSize / 2;

        // Если это строковое выравнивание
        if (axis === "x") {
            switch (align) {
                case "left":
                    return 0;
                case "center":
                    return containerSize / 2 - childCenter;
                case "right":
                    return containerSize - childSize;
                default:
                    return childCenter;
            }
        } else {
            // axis === 'y'
            switch (align) {
                case "top":
                    return 0;
                case "center":
                    return containerSize / 2 - childCenter;
                case "bottom":
                    return containerSize - childSize;
                default:
                    return childCenter;
            }
        }
    }

    /**
     * Вычисляет offset из свойств offset
     */
    _calculateOffset(offset, containerWidth, containerHeight) {
        let offsetX = 0;
        let offsetY = 0;

        if (typeof offset === "number" || typeof offset === "string") {
            offset = { x: offset, y: offset };
        }

        // Обрабатываем x/y offset
        if (offset.x !== undefined) {
            offsetX += this._parseValue(offset.x, containerWidth);
        }
        if (offset.y !== undefined) {
            offsetY += this._parseValue(offset.y, containerHeight);
        }

        // Обрабатываем left/right offset
        if (offset.left !== undefined) {
            offsetX += this._parseValue(offset.left, containerWidth);
        }
        if (offset.right !== undefined) {
            offsetX -= this._parseValue(offset.right, containerWidth);
        }

        // Обрабатываем top/bottom offset
        if (offset.top !== undefined) {
            offsetY += this._parseValue(offset.top, containerHeight);
        }
        if (offset.bottom !== undefined) {
            offsetY -= this._parseValue(offset.bottom, containerHeight);
        }

        if (offset.centerX !== undefined) {
            offsetX += this._parseValue(offset.centerX, containerWidth);
        }
        if (offset.centerY !== undefined) {
            offsetY += this._parseValue(offset.centerY, containerHeight);
        }

        return { offsetX, offsetY };
    }

    /**
     * Парсит значение - число или процент
     */
    _parseValue(value, containerSize) {
        if (typeof value === "string" && value.endsWith("%")) {
            const percent = parseFloat(value) / 100;
            return containerSize * percent;
        }
        return parseFloat(value) || 0;
    }

    /**
     * Применяет выравнивание всего контейнера относительно нулевых координат
     */
    _applyAreaAlignment() {
        const width = this.calculatedWidth;
        const height = this.calculatedHeight;

        let offsetX = 0;
        let offsetY = 0;

        if (this.areaAlign.x === "center") {
            offsetX = -width / 2;
        } else if (this.areaAlign.x === "right") {
            offsetX = -width;
        }

        if (this.areaAlign.y === "center") {
            offsetY = -height / 2;
        } else if (this.areaAlign.y === "bottom") {
            offsetY = -height;
        }

        this.children.forEach(child => {
            child.x += offsetX;
            child.y += offsetY;
        });
    }

    addChild(...children) {
        const result = super.addChild(...children);
        this.layout();
        return result;
    }

    removeChild(child) {
        super.removeChild(child);
        this.layout();
    }
}
