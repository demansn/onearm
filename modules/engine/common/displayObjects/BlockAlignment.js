import { Rectangle, Graphics } from "pixi.js";

/**
 * BlockAlignment - Simplified alignment utility for PIXI display objects
 *
 * Aligns a group of elements within a defined area with support for:
 * - Horizontal alignment (left, center, right)
 * - Vertical alignment (top, center, bottom)
 * - Padding and margin
 * - Flexible area sizing
 *
 * @example
 * ```javascript
 * const alignment = new BlockAlignment({
 *   align: { x: 'center', y: 'top' },
 *   size: { width: 400, height: 300 }
 * });
 *
 * // Position represents the top-left corner of the alignment area
 * alignment.alignElements([sprite1, text1], { x: 100, y: 50 });
 * ```
 */
export class BlockAlignment {
    constructor(config = {}) {
        // Alignment settings
        this.align = {
            x: "left",
            y: "top",
            ...(config.align || {}),
        };

        // Area size
        this.size = {
            width: 0,
            height: 0,
            ...(config.size || {}),
        };

        // Padding (space inside alignment area)
        this.padding = {
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            ...(config.padding || {}),
        };

        // Margin (space outside alignment area)
        this.margin = {
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            ...(config.margin || {}),
        };

        // Debug mode
        this._debug = config.debug || false;
    }

    updateConfig(newConfig) {
        if (newConfig.align) {
            Object.assign(this.align, newConfig.align);
        }
        if (newConfig.size) {
            Object.assign(this.size, newConfig.size);
        }
        if (newConfig.padding) {
            Object.assign(this.padding, newConfig.padding);
        }
        if (newConfig.margin) {
            Object.assign(this.margin, newConfig.margin);
        }
        if (newConfig.debug !== undefined) {
            this._debug = newConfig.debug;
        }
    }

    alignContainer(container, position = null) {
        if (!container || !container.children || container.children.length === 0) {
            console.warn("BlockAlignment: Container is empty or invalid");
            return;
        }
        this.alignElements(container.children, position);
    }

    alignElements(elements, position = null) {
        if (!elements || elements.length === 0) {
            console.warn("BlockAlignment: No elements to align");
            return;
        }

        if (this.size.width === 0 || this.size.height === 0) {
            console.warn("BlockAlignment: Size is 0x0, alignment will not work properly");
            return;
        }

        const bounds = this.calculateElementsBounds(elements);
        if (!bounds) {
            console.warn("BlockAlignment: Could not calculate elements bounds");
            return;
        }

        const targetPosition = this.calculateTargetPosition(bounds, position);

        if (this._debug) {
            console.log("🔧 BlockAlignment:", {
                bounds,
                targetPosition,
                size: this.size,
                align: this.align,
            });
        }

        this.applyAlignment(elements, bounds, targetPosition);
    }

    calculateElementsBounds(elements) {
        if (elements.length === 0) return null;

        let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;

        for (const element of elements) {
            try {
                const x = element.x || 0;
                const y = element.y || 0;
                const width = element.width || 0;
                const height = element.height || 0;

                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x + width);
                maxY = Math.max(maxY, y + height);
            } catch (error) {
                console.warn(
                    "BlockAlignment: Error calculating bounds for element:",
                    element,
                    error,
                );
                continue;
            }
        }

        if (minX === Infinity || minY === Infinity) return null;
        return new Rectangle(minX, minY, maxX - minX, maxY - minY);
    }

    calculateTargetPosition(bounds, positionOverride = null) {
        // Position represents top-left corner of alignment area
        let areaX = 0;
        let areaY = 0;

        if (positionOverride) {
            areaX = positionOverride.x || 0;
            areaY = positionOverride.y || 0;
        }

        // Calculate available space after margin and padding
        const availableWidth = this.size.width - this.padding.left - this.padding.right;
        const availableHeight = this.size.height - this.padding.top - this.padding.bottom;

        // Calculate alignment offset
        let alignOffsetX = 0;
        let alignOffsetY = 0;

        switch (this.align.x) {
            case "center":
                alignOffsetX = (availableWidth - bounds.width) / 2;
                break;
            case "right":
                alignOffsetX = availableWidth - bounds.width;
                break;
            case "left":
            default:
                alignOffsetX = 0;
                break;
        }

        switch (this.align.y) {
            case "center":
                alignOffsetY = (availableHeight - bounds.height) / 2;
                break;
            case "bottom":
                alignOffsetY = availableHeight - bounds.height;
                break;
            case "top":
            default:
                alignOffsetY = 0;
                break;
        }

        // Final target position
        const targetX = areaX + this.margin.left + this.padding.left + alignOffsetX;
        const targetY = areaY + this.margin.top + this.padding.top + alignOffsetY;

        return { x: targetX, y: targetY };
    }

    applyAlignment(elements, currentBounds, targetPosition) {
        if (elements.length === 0) return;

        // Calculate offset to move elements
        const offsetX = targetPosition.x - currentBounds.x;
        const offsetY = targetPosition.y - currentBounds.y;

        // Apply offset to all elements
        for (const element of elements) {
            element.x += offsetX;
            element.y += offsetY;
        }
    }

    createDebugOverlay(parent, position = { x: 0, y: 0 }) {
        const graphics = new Graphics();

        // Draw alignment area (red border)
        graphics.rect(position.x, position.y, this.size.width, this.size.height);
        graphics.stroke({ color: 0xff0000, width: 2, alpha: 0.8 });

        // Draw content area after padding (green border)
        const contentX = position.x + this.padding.left;
        const contentY = position.y + this.padding.top;
        const contentWidth = this.size.width - this.padding.left - this.padding.right;
        const contentHeight = this.size.height - this.padding.top - this.padding.bottom;

        graphics.rect(contentX, contentY, contentWidth, contentHeight);
        graphics.stroke({ color: 0x00ff00, width: 1, alpha: 0.6 });

        // Draw position marker (blue dot)
        graphics.circle(position.x, position.y, 5);
        graphics.fill({ color: 0x0000ff, alpha: 0.8 });

        parent.addChild(graphics);
        return graphics;
    }

    static preset(preset, overrides = {}) {
        const presets = {
            "top-left": { align: { x: "left", y: "top" } },
            "top-center": { align: { x: "center", y: "top" } },
            "top-right": { align: { x: "right", y: "top" } },
            "center-left": { align: { x: "left", y: "center" } },
            center: { align: { x: "center", y: "center" } },
            "center-right": { align: { x: "right", y: "center" } },
            "bottom-left": { align: { x: "left", y: "bottom" } },
            "bottom-center": { align: { x: "center", y: "bottom" } },
            "bottom-right": { align: { x: "right", y: "bottom" } },
        };

        const config = presets[preset];
        if (!config) {
            console.warn(`BlockAlignment: Unknown preset "${preset}"`);
            return new BlockAlignment(overrides);
        }

        return new BlockAlignment({ ...config, ...overrides });
    }
}
