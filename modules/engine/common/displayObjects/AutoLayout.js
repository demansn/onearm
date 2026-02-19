import { SuperContainer } from "./SuperContainer.js";

/**
 * AutoLayout - универсальный контейнер для автоматического позиционирования дочерних элементов
 * с поддержкой различных потоков, wrap-переносов и выравнивания
 */
export class AutoLayout extends SuperContainer {
    #size;
    /**
     * @param {Object} options - Параметры для настройки AutoLayout
     * @param {string} [options.name='AutoLayout'] - Имя контейнера
     * @param {Object} [options.contentAlign={x: 'left', y: 'top'}] - Выравнивание содержимого внутри size
     * @param {string} [options.contentAlign.x='left'] - Горизонтальное выравнивание: 'left', 'center', 'right'
     * @param {string} [options.contentAlign.y='top'] - Вертикальное выравнивание: 'top', 'center', 'bottom'
     * @param {string} [options.flow='horizontal'] - Направление потока: 'horizontal', 'vertical'
     * @param {boolean|number} [options.wrap=false] - Перенос: true (по размеру), number (по количеству), false (без переноса)
     * @param {Object} [options.size=null] - Ограничивающий прямоугольник
     * @param {number} [options.size.width] - Ширина контейнера
     * @param {number} [options.size.height] - Высота контейнера
     * @param {number|Object} [options.gap=0] - Расстояние между элементами
     * @param {number} [options.gap.x=0] - Горизонтальное расстояние между элементами
     * @param {number} [options.gap.y=0] - Вертикальное расстояние между элементами
     * @param {Object} [options.areaAlign={x: 'left', y: 'top'}] - Выравнивание всей области относительно нулевых координат
     * @param {string} [options.areaAlign.x='left'] - Горизонтальное выравнивание области: 'left', 'center', 'right'
     * @param {string} [options.areaAlign.y='top'] - Вертикальное выравнивание области: 'top', 'center', 'bottom'
     * @param {boolean} [options.spaceBetween=false] - Распределение элементов с равными промежутками между ними
     */
    constructor({
        name = "AutoLayout",
        contentAlign = { x: "left", y: "top" },
        flow = "horizontal",
        wrap = false,
        size = null,
        gap = 0,
        areaAlign = { x: "left", y: "top" },
        spaceBetween = false,
    } = {}) {
        super();

        this.label = name;
        this.contentAlign = contentAlign;
        this.flow = flow;
        this.wrap = wrap;
        this.#size = size;
        this.areaAlign = areaAlign;
        this.spaceBetween = spaceBetween;

        // Нормализуем gap в объект
        this.gap = typeof gap === "number" ? { x: gap, y: gap } : { x: 0, y: 0, ...gap };

        this.calculatedWidth = 0;
        this.calculatedHeight = 0;
        this.dry = false;
    }

    set size(value) {
        this.#size = value;
        this.layout();
    }

    get size() {
        return this.#size;
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

        const lines = this._arrangeIntoLines(visibleChildren);
        const { contentWidth, contentHeight } = this._calculateContentSize(lines);

        this.calculatedWidth = contentWidth;
        this.calculatedHeight = contentHeight;

        const containerWidth = this.size?.width || contentWidth;
        const containerHeight = this.size?.height || contentHeight;

        this._positionLines(lines, containerWidth, containerHeight);
        this._applyAreaAlignment();
    }

    /**
     * Разбивает дочерние элементы на строки/столбцы с учетом wrap
     */
    _arrangeIntoLines(children) {
        const lines = [];
        let currentLine = [];
        let currentLineSize = 0;

        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const childSize = this.flow === "horizontal" ? child.width : child.height;
            const gapSize =
                currentLine.length > 0 ? (this.flow === "horizontal" ? this.gap.x : this.gap.y) : 0;

            const shouldWrap = this._shouldWrap(
                currentLine,
                currentLineSize + gapSize + childSize,
                i,
            );

            if (shouldWrap && currentLine.length > 0) {
                lines.push(currentLine);
                currentLine = [child];
                currentLineSize = childSize;
            } else {
                currentLine.push(child);
                currentLineSize += gapSize + childSize;
            }
        }

        if (currentLine.length > 0) {
            lines.push(currentLine);
        }

        return lines;
    }

    /**
     * Проверяет нужно ли переносить элемент на новую строку/столбец
     */
    _shouldWrap(currentLine, newLineSize, elementIndex) {
        if (this.wrap === false) return false;

        if (typeof this.wrap === "number") {
            return currentLine.length >= this.wrap;
        }

        if (this.wrap === true && this.size) {
            const maxSize = this.flow === "horizontal" ? this.size.width : this.size.height;
            return maxSize && newLineSize > maxSize;
        }

        return false;
    }

    /**
     * Вычисляет общие размеры контента
     */
    _calculateContentSize(lines) {
        let contentWidth = 0;
        let contentHeight = 0;

        lines.forEach((line, lineIndex) => {
            let lineWidth = 0;
            let lineHeight = 0;

            line.forEach((child, childIndex) => {
                if (this.flow === "horizontal") {
                    lineWidth += child.width + (childIndex > 0 ? this.gap.x : 0);
                    lineHeight = Math.max(lineHeight, child.height);
                } else {
                    lineHeight += child.height + (childIndex > 0 ? this.gap.y : 0);
                    lineWidth = Math.max(lineWidth, child.width);
                }
            });

            if (this.flow === "horizontal") {
                contentWidth = Math.max(contentWidth, lineWidth);
                contentHeight += lineHeight + (lineIndex > 0 ? this.gap.y : 0);
            } else {
                contentHeight = Math.max(contentHeight, lineHeight);
                contentWidth += lineWidth + (lineIndex > 0 ? this.gap.x : 0);
            }
        });

        return { contentWidth, contentHeight };
    }

    /**
     * Позиционирует строки/столбцы с учетом contentAlign
     */
    _positionLines(lines, containerWidth, containerHeight) {
        let currentOffset = 0;

        lines.forEach(line => {
            const { lineWidth, lineHeight } = this._getLineSize(line);

            // Позиционируем элементы внутри строки/столбца
            this._positionElementsInLine(
                line,
                lineWidth,
                lineHeight,
                containerWidth,
                containerHeight,
                currentOffset,
            );

            // Сдвигаем offset для следующей строки/столбца
            currentOffset +=
                (this.flow === "horizontal" ? lineHeight : lineWidth) +
                (this.flow === "horizontal" ? this.gap.y : this.gap.x);
        });
    }

    /**
     * Получает размеры строки/столбца
     */
    _getLineSize(line) {
        let lineWidth = 0;
        let lineHeight = 0;

        line.forEach((child, index) => {
            if (this.flow === "horizontal") {
                lineWidth += child.width + (index > 0 ? this.gap.x : 0);
                lineHeight = Math.max(lineHeight, child.height);
            } else {
                lineHeight += child.height + (index > 0 ? this.gap.y : 0);
                lineWidth = Math.max(lineWidth, child.width);
            }
        });

        return { lineWidth, lineHeight };
    }

    /**
     * Позиционирует элементы внутри одной строки/столбца
     */
    _positionElementsInLine(
        line,
        lineWidth,
        lineHeight,
        containerWidth,
        containerHeight,
        lineOffset,
    ) {
        const containerSize = this.flow === "horizontal" ? containerWidth : containerHeight;
        const lineSize = this.flow === "horizontal" ? lineWidth : lineHeight;

        // Вычисляем стартовую позицию для выравнивания внутри контейнера
        let lineStart = 0;
        const alignProp = this.flow === "horizontal" ? this.contentAlign.x : this.contentAlign.y;

        if (alignProp === "center") {
            lineStart = (containerSize - lineSize) / 2;
        } else if (alignProp === "right" || alignProp === "bottom") {
            lineStart = containerSize - lineSize;
        }

        if (this.spaceBetween && line.length > 1) {
            // Распределяем элементы с равными промежутками
            const totalElementsSize = this._getElementsTotalSize(line);
            const availableSpace = containerSize - totalElementsSize;
            const spaceBetweenElements = Math.max(0, availableSpace / (line.length - 1));

            let currentPos = lineStart;

            line.forEach((child, index) => {
                if (this.flow === "horizontal") {
                    child.x = currentPos;

                    // Вертикальное выравнивание внутри строки
                    let yPos = lineOffset;
                    if (this.contentAlign.y === "center") {
                        yPos += (lineHeight - child.height) / 2;
                    } else if (this.contentAlign.y === "bottom") {
                        yPos += lineHeight - child.height;
                    }
                    child.y = yPos;

                    currentPos += child.width + spaceBetweenElements;
                } else {
                    child.y = currentPos;

                    // Горизонтальное выравнивание внутри столбца
                    const baseXPos = this._getBaseXPosition(containerWidth, lineWidth);
                    let xPos = baseXPos;
                    if (this.contentAlign.x === "center") {
                        xPos += (lineWidth - child.width) / 2;
                    } else if (this.contentAlign.x === "right") {
                        xPos += lineWidth - child.width;
                    }
                    child.x = xPos;

                    currentPos += child.height + spaceBetweenElements;
                }
            });
        } else {
            // Обычное позиционирование с gap
            let currentPos = lineStart;

            line.forEach((child, index) => {
                if (this.flow === "horizontal") {
                    child.x = currentPos;

                    // Вертикальное выравнивание внутри строки
                    let yPos = lineOffset;
                    if (this.contentAlign.y === "center") {
                        yPos += (lineHeight - child.height) / 2;
                    } else if (this.contentAlign.y === "bottom") {
                        yPos += lineHeight - child.height;
                    }
                    child.y = yPos;

                    currentPos += child.width + this.gap.x;
                } else {
                    child.y = currentPos;

                    // Горизонтальное выравнивание внутри столбца
                    const baseXPos = this._getBaseXPosition(containerWidth, lineWidth);
                    let xPos = baseXPos;
                    if (this.contentAlign.x === "center") {
                        xPos += (lineWidth - child.width) / 2;
                    } else if (this.contentAlign.x === "right") {
                        xPos += lineWidth - child.width;
                    }
                    child.x = xPos;

                    currentPos += child.height + this.gap.y;
                }
            });
        }
    }

    /**
     * Вычисляет базовую X позицию для вертикального потока
     */
    _getBaseXPosition(containerWidth, lineWidth) {
        if (this.contentAlign.x === "center") {
            return (containerWidth - lineWidth) / 2;
        } else if (this.contentAlign.x === "right") {
            return containerWidth - lineWidth;
        }
        return 0;
    }

    /**
     * Вычисляет общий размер всех элементов в строке/столбце
     */
    _getElementsTotalSize(line) {
        let totalSize = 0;

        line.forEach(child => {
            if (this.flow === "horizontal") {
                totalSize += child.width;
            } else {
                totalSize += child.height;
            }
        });

        return totalSize;
    }

    /**
     * Применяет выравнивание всей области относительно нулевых координат
     */
    _applyAreaAlignment() {
        const width = this.size?.width || this.calculatedWidth;
        const height = this.size?.height || this.calculatedHeight;

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
