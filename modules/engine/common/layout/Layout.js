import { BaseContainer } from "../core/BaseContainer.js";

/**
 * Layout - unified container for positioning child elements.
 *
 * Supports two modes:
 * - "auto": Automatic flow-based positioning (horizontal/vertical with wrap, gap, spaceBetween).
 *   Previously known as AutoLayout.
 * - "manual": Individual positioning per child via child.display property (align, offset).
 *   Previously known as FlexContainer.
 *
 * @example Auto mode (horizontal flow with gap):
 * new Layout({ mode: "auto", flow: "horizontal", gap: 10 });
 *
 * @example Manual mode (individual child positioning):
 * new Layout({ mode: "manual", size: { width: 800, height: 600 } });
 */
export class Layout extends BaseContainer {
    #size;

    constructor({
        name = "Layout",
        mode = "auto",

        // Common
        size = null,
        areaAlign = { x: "left", y: "top" },

        // Auto mode options
        flow = "horizontal",
        gap = 0,
        wrap = false,
        contentAlign = { x: "left", y: "top" },
        spaceBetween = false,

        ...props
    } = {}) {
        super(props);

        this.label = name;
        this.mode = mode;
        this.#size = size;
        this.areaAlign = areaAlign;

        // Auto mode
        this.flow = flow;
        this.gap = typeof gap === "number" ? { x: gap, y: gap } : { x: 0, y: 0, ...gap };
        this.wrap = wrap;
        this.contentAlign = contentAlign;
        this.spaceBetween = spaceBetween;

        this.calculatedWidth = 0;
        this.calculatedHeight = 0;
    }

    set size(value) {
        this.#size = value;
        this.layout();
    }

    get size() {
        return this.#size;
    }

    setSize(width, height) {
        this.#size = { width, height };
        this.layout();
    }

    /**
     * Recalculate and apply layout to all children.
     */
    layout() {
        if (this.mode === "auto") {
            this._layoutAuto();
        } else {
            this._layoutManual();
        }
    }

    // ═══════════════════════════════════════════════
    // AUTO MODE (previously AutoLayout)
    // ═══════════════════════════════════════════════

    _layoutAuto() {
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

        const containerWidth = this.#size?.width || contentWidth;
        const containerHeight = this.#size?.height || contentHeight;

        this._positionLines(lines, containerWidth, containerHeight);
        this._applyAreaAlignment(containerWidth, containerHeight);
    }

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

    _shouldWrap(currentLine, newLineSize, elementIndex) {
        if (this.wrap === false) return false;

        if (typeof this.wrap === "number") {
            return currentLine.length >= this.wrap;
        }

        if (this.wrap === true && this.#size) {
            const maxSize = this.flow === "horizontal" ? this.#size.width : this.#size.height;
            return maxSize && newLineSize > maxSize;
        }

        return false;
    }

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

    _positionLines(lines, containerWidth, containerHeight) {
        let currentOffset = 0;

        lines.forEach(line => {
            const { lineWidth, lineHeight } = this._getLineSize(line);

            this._positionElementsInLine(
                line,
                lineWidth,
                lineHeight,
                containerWidth,
                containerHeight,
                currentOffset,
            );

            currentOffset +=
                (this.flow === "horizontal" ? lineHeight : lineWidth) +
                (this.flow === "horizontal" ? this.gap.y : this.gap.x);
        });
    }

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

        let lineStart = 0;
        const alignProp = this.flow === "horizontal" ? this.contentAlign.x : this.contentAlign.y;

        if (alignProp === "center") {
            lineStart = (containerSize - lineSize) / 2;
        } else if (alignProp === "right" || alignProp === "bottom") {
            lineStart = containerSize - lineSize;
        }

        if (this.spaceBetween && line.length > 1) {
            const totalElementsSize = this._getElementsTotalSize(line);
            const availableSpace = containerSize - totalElementsSize;
            const spaceBetweenElements = Math.max(0, availableSpace / (line.length - 1));

            let currentPos = lineStart;

            line.forEach((child, index) => {
                if (this.flow === "horizontal") {
                    child.x = currentPos;
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
            let currentPos = lineStart;

            line.forEach((child, index) => {
                if (this.flow === "horizontal") {
                    child.x = currentPos;
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

    _getBaseXPosition(containerWidth, lineWidth) {
        if (this.contentAlign.x === "center") {
            return (containerWidth - lineWidth) / 2;
        } else if (this.contentAlign.x === "right") {
            return containerWidth - lineWidth;
        }
        return 0;
    }

    _getElementsTotalSize(line) {
        let totalSize = 0;
        line.forEach(child => {
            totalSize += this.flow === "horizontal" ? child.width : child.height;
        });
        return totalSize;
    }

    // ═══════════════════════════════════════════════
    // MANUAL MODE (previously FlexContainer)
    // ═══════════════════════════════════════════════

    _layoutManual() {
        const visibleChildren = this.children.filter(child => child.visible);

        if (visibleChildren.length === 0) {
            this.calculatedWidth = 0;
            this.calculatedHeight = 0;
            return;
        }

        const { containerWidth, containerHeight } = this._getManualContainerSize(visibleChildren);

        this.calculatedWidth = containerWidth;
        this.calculatedHeight = containerHeight;

        visibleChildren.forEach(child => {
            this._positionChildManual(child, containerWidth, containerHeight);
        });

        this._applyAreaAlignment(containerWidth, containerHeight);
    }

    _getManualContainerSize(children) {
        let containerWidth, containerHeight;

        if (this.#size === "auto" || !this.#size) {
            containerWidth = Math.max(...children.map(child => child.x + child.width));
            containerHeight = Math.max(...children.map(child => child.y + child.height));
        } else {
            containerWidth = this.#size.width || 0;
            containerHeight = this.#size.height || 0;
        }

        return { containerWidth, containerHeight };
    }

    _positionChildManual(child, containerWidth, containerHeight) {
        const { align = { x: "left", y: "top" }, offset = {} } = child.display || child;
        let childSize = { width: child.width, height: child.height };

        if (child.label && child.label.endsWith("_ph")) {
            childSize = { width: 0, height: 0 };
        }

        const baseX = this._calculateManualPosition(align.x, containerWidth, childSize.width, "x");
        const baseY = this._calculateManualPosition(align.y, containerHeight, childSize.height, "y");
        const { offsetX, offsetY } = this._calculateManualOffset(offset, containerWidth, containerHeight);

        if (baseX !== undefined) {
            child.x = baseX + offsetX;
        }

        if (baseY !== undefined) {
            child.y = baseY + offsetY;
        }
    }

    _calculateManualPosition(align, containerSize, childSize, axis) {
        if (typeof align === "number") {
            return align;
        }

        if (typeof align === "string" && align.endsWith("%")) {
            const percent = parseFloat(align) / 100;
            return containerSize * percent - childSize * percent;
        }

        const childCenter = childSize / 2;

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

    _calculateManualOffset(offset, containerWidth, containerHeight) {
        let offsetX = 0;
        let offsetY = 0;

        if (typeof offset === "number" || typeof offset === "string") {
            offset = { x: offset, y: offset };
        }

        if (offset.x !== undefined) {
            offsetX += this._parseManualValue(offset.x, containerWidth);
        }
        if (offset.y !== undefined) {
            offsetY += this._parseManualValue(offset.y, containerHeight);
        }

        if (offset.left !== undefined) {
            offsetX += this._parseManualValue(offset.left, containerWidth);
        }
        if (offset.right !== undefined) {
            offsetX -= this._parseManualValue(offset.right, containerWidth);
        }

        if (offset.top !== undefined) {
            offsetY += this._parseManualValue(offset.top, containerHeight);
        }
        if (offset.bottom !== undefined) {
            offsetY -= this._parseManualValue(offset.bottom, containerHeight);
        }

        if (offset.centerX !== undefined) {
            offsetX += this._parseManualValue(offset.centerX, containerWidth);
        }
        if (offset.centerY !== undefined) {
            offsetY += this._parseManualValue(offset.centerY, containerHeight);
        }

        return { offsetX, offsetY };
    }

    _parseManualValue(value, containerSize) {
        if (typeof value === "string" && value.endsWith("%")) {
            const percent = parseFloat(value) / 100;
            return containerSize * percent;
        }
        return parseFloat(value) || 0;
    }

    // ═══════════════════════════════════════════════
    // SHARED
    // ═══════════════════════════════════════════════

    _applyAreaAlignment(width, height) {
        width = width || (this.mode === "auto" ? (this.#size?.width || this.calculatedWidth) : this.calculatedWidth);
        height = height || (this.mode === "auto" ? (this.#size?.height || this.calculatedHeight) : this.calculatedHeight);

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
