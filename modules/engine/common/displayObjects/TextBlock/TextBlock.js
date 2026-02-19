import { Container, Text, Sprite, TextStyle } from "pixi.js";

/**
 * TextBlock - Advanced rich text component for PIXI.js (JavaScript version)
 *
 * Provides functionality for displaying mixed content (text, images) with:
 * - Word wrapping with customizable width
 * - Multiple text styles within one block
 * - Inline images with custom scaling
 * - Flexible alignment options
 * - Text transformation (uppercase, lowercase, capitalize)
 * - Optimized rendering performance through text grouping
 *
 * @author Generated AI Assistant
 * @version 1.0.0
 * @since 1.0.0
 */

/**
 * TextBlock allows displaying rich text with images and different text styles
 * Supports word wrapping, line breaks, and text alignment
 *
 * @example
 * ```javascript
 * const defaultStyle = {
 *   wordWrap: true,
 *   wordWrapWidth: 300,
 *   lineHeight: 1.2,
 *   lineSpacing: 10,
 *   align: 'center',
 *   vAlign: 'top'
 * };
 *
 * const styles = {
 *   heading: { fontSize: 24, fill: 0x000000 }
 * };
 *
 * const images = {
 *   icon: iconTexture
 * };
 *
 * const textBlock = new TextBlock({
 *   elements: [
 *     {type: 'Text', text: "Hello", style: {fontSize: 20, fill: 0x000000}},
 *     {type: 'Text', text: " world"},
 *     {type: 'Image', image: "icon", scale: 0.5},
 *     {type: 'Text', text: "new text", style: 'heading'},
 *     {type: 'NextLine'},
 *     {type: 'Text', text: "next line"},
 *   ],
 *   images,
 *   styles,
 *   style: defaultStyle
 * });
 * ```
 */
export class TextBlock extends Container {
    /**
     * Creates a new TextBlock instance
     *
     * @param {Object} config - Configuration object with elements, resources, and styling
     * @param {Array} config.elements - Array of text, image, and line break elements
     * @param {Object} [config.images] - Map of image names to PIXI Textures
     * @param {Object} [config.styles] - Map of style names to style configurations
     * @param {Object} [config.values] - Map of template values for {{key}} substitution
     * @param {Object} [config.style] - Default style configuration for the entire block
     *
     * @example
     * ```javascript
     * const textBlock = new TextBlock({
     *   elements: [
     *     { type: "Text", text: "Hello {{name}}", style: "greeting" },
     *     { type: "Image", image: "icon", scale: 0.5 },
     *     { type: "NextLine" },
     *     { type: "Text", text: "Welcome!" }
     *   ],
     *   images: { icon: iconTexture },
     *   styles: { greeting: { fontSize: 24, fill: 0xff0000, textTransform: "uppercase" } },
     *   values: { name: "User" },
     *   style: {
     *     wordWrap: true,
     *     wordWrapWidth: 400,
     *     align: "center"
     *   }
     * });
     *
     * // Minimal usage - only elements required
     * const simpleBlock = new TextBlock({
     *   elements: [{ type: "Text", text: "Simple text" }]
     * });
     * ```
     */
    constructor(config) {
        super();

        // Source element definitions
        this._elements = config.elements || [];

        // Available images, named styles, and template values
        this._resources = {
            images: config.images || {},
            styles: config.styles || {},
            values: config.values || {},
        };

        // Default style applied to all text elements
        this._defaultStyle = {
            // Standard PIXI TextStyle properties
            fontSize: 16,
            fill: 0x000000,
            fontFamily: "Arial",
            // Custom layout behavior defaults
            lineHeight: 1.2,
            lineSpacing: 4,
            align: "left", // Horizontal alignment of lines
            vAlign: "top", // Vertical alignment of elements within lines
            textTransform: "none", // Text case transformation

            // Container size properties
            size: null, // { width: number, height: number } or null for auto-size
            alignItems: { x: "left", y: "top" }, // Alignment of all content within the container

            // Override with user preferences
            ...(config.style || {}),
        };

        // Calculated line layout information
        this._lines = [];
        // Dirty flag to optimize layout recalculation
        this._isDirty = true;

        // Build initial layout
        this.updateLayout();
    }

    /**
     * Updates TextBlock with new configuration
     * Preserves existing configuration and merges with new values
     *
     * @param {Object} newConfig - New configuration to merge
     * @param {Array} [newConfig.elements] - New elements array
     * @param {Object} [newConfig.images] - New images to add/update
     * @param {Object} [newConfig.styles] - New styles to add/update
     * @param {Object} [newConfig.values] - New template values to add/update
     * @param {Object} [newConfig.style] - New default style properties
     *
     * @example
     * ```javascript
     * textBlock.updateConfig({
     *   values: { score: "1250", level: "5" },
     *   style: { fill: 0xff0000 }
     * });
     * ```
     */
    updateConfig(newConfig) {
        if (newConfig.elements !== undefined) {
            this._elements = newConfig.elements;
            this._isDirty = true;
        }

        if (newConfig.images) {
            Object.assign(this._resources.images, newConfig.images);
            this._isDirty = true;
        }

        if (newConfig.styles) {
            Object.assign(this._resources.styles, newConfig.styles);
            this._isDirty = true;
        }

        if (newConfig.values) {
            Object.assign(this._resources.values, newConfig.values);
            this._isDirty = true;
        }

        if (newConfig.style) {
            Object.assign(this._defaultStyle, newConfig.style);
            this._isDirty = true;
        }

        if (this._isDirty) {
            this.updateLayout();
        }
    }

    /**
     * Updates template values for dynamic text content
     *
     * @param {Object} newValues - New template values to merge
     *
     * @example
     * ```javascript
     * textBlock.updateValues({
     *   health: "85",
     *   energy: "42",
     *   score: "15750"
     * });
     * ```
     */
    updateValues(newValues) {
        Object.assign(this._resources.values, newValues);
        this._isDirty = true;
        this.updateLayout();
    }

    /**
     * Updates named styles configuration
     *
     * @param {Object} newStyles - New styles to merge
     *
     * @example
     * ```javascript
     * textBlock.updateStyles({
     *   header: { fontSize: 28, fontWeight: "bold", textTransform: "uppercase" },
     *   warning: { fill: 0xff0000, fontSize: 14 }
     * });
     * ```
     */
    updateStyles(newStyles) {
        Object.assign(this._resources.styles, newStyles);
        this._isDirty = true;
        this.updateLayout();
    }

    /**
     * Marks the layout as dirty and triggers recalculation
     * Call this when properties change that affect layout
     *
     * @example
     * ```javascript
     * textBlock.invalidate();
     * ```
     */
    invalidate() {
        this._isDirty = true;
        this.updateLayout();
    }

    /**
     * Forces a complete layout recalculation and re-rendering
     * Called automatically when content changes, but can be called manually
     *
     * @example
     * ```javascript
     * textBlock.updateLayout();
     * ```
     */
    updateLayout() {
        if (!this._isDirty) return;

        // Clear existing display objects
        this.removeChildren();
        this._lines = [];

        // Three-phase layout process:
        this.calculateLayout(); // 1. Create and measure elements
        this.positionElements(); // 2. Position elements with alignment
        // 3. Add elements to display tree (done in positionElements)

        this._isDirty = false;
    }

    /**
     * Phase 1: Creates PIXI display objects and calculates line layout
     * Handles word wrapping, line breaks, and element measurement
     *
     * @private
     *
     * @remarks
     * This phase processes all elements and determines:
     * - Which elements go on which lines
     * - How lines wrap based on wordWrapWidth
     * - Final dimensions of each line
     * - Y positions for each line
     */
    calculateLayout() {
        // Current line being built
        let currentLine = [];
        // Y position for next line
        let currentY = 0;
        // Maximum height of elements in current line
        let lineHeight = 0;

        // Process each element in sequence
        for (const element of this._elements) {
            // Handle forced line breaks
            if (element.type === "NextLine") {
                // Finish current line if it has content
                this.finalizeLine(currentLine, lineHeight, currentY);
                // Move to next line position
                currentY += lineHeight + (this._defaultStyle.lineSpacing || 0);
                // Reset for new line
                currentLine = [];
                lineHeight = 0;
                continue;
            }

            // Handle text elements with word wrapping
            if (element.type === "Text") {
                const result = this.processTextElement(element, currentLine, lineHeight, currentY);
                // Update state from text processing
                currentLine = result.currentLine;
                lineHeight = result.lineHeight;
                currentY = result.currentY;
            } else {
                // Handle non-text elements (images)
                const pixiElement = this.createElement(element);
                if (!pixiElement) continue;

                const elementWidth = pixiElement.width;
                const elementHeight = pixiElement.height;

                // Check if image would exceed line width
                if (this._defaultStyle.wordWrap && currentLine.length > 0) {
                    const currentLineWidth = currentLine.reduce((sum, item) => sum + item.width, 0);

                    // Wrap to new line if image doesn't fit
                    if (
                        currentLineWidth + elementWidth >
                        (this._defaultStyle.wordWrapWidth || 300)
                    ) {
                        this.finalizeLine(currentLine, lineHeight, currentY);
                        currentY += lineHeight + (this._defaultStyle.lineSpacing || 0);
                        currentLine = [];
                        lineHeight = 0;
                    }
                }

                // Add image to current line
                currentLine.push({
                    element: pixiElement,
                    width: elementWidth,
                    height: elementHeight,
                });

                // Update line height to accommodate image
                lineHeight = Math.max(lineHeight, elementHeight);
            }
        }

        // Don't forget the last line if it has content
        if (currentLine.length > 0) {
            this.finalizeLine(currentLine, lineHeight, currentY);
        }
    }

    /**
     * Applies text transformation based on style settings
     *
     * @private
     * @param {string} text - The text to transform
     * @param {Object|string} [style] - Style configuration that may contain textTransform
     * @returns {string} Transformed text
     *
     * @remarks
     * Transforms text case according to the textTransform style property:
     * - "uppercase": Converts text to UPPER CASE
     * - "lowercase": Converts text to lower case
     * - "capitalize": Capitalizes first letter of each word
     * - "none" or undefined: Returns text unchanged
     */
    applyTextTransform(text, style) {
        // Get the full style to check for textTransform
        let fullStyle = { ...this._defaultStyle };

        if (typeof style === "string") {
            const namedStyle = this._resources.styles?.[style];
            if (namedStyle) {
                fullStyle = { ...fullStyle, ...namedStyle };
            }
        } else if (style) {
            fullStyle = { ...fullStyle, ...style };
        }

        const textTransform = fullStyle.textTransform;

        switch (textTransform) {
            case "uppercase":
                return text.toUpperCase();
            case "lowercase":
                return text.toLowerCase();
            case "capitalize":
                return text.replace(/\b\w/g, char => char.toUpperCase());
            case "none":
            default:
                return text;
        }
    }

    /**
     * Processes text element with optimized word wrapping
     *
     * @private
     * @param {Object} element - Text element to process
     * @param {Array} currentLine - Current line being built
     * @param {number} lineHeight - Current maximum line height
     * @param {number} currentY - Current Y position
     * @returns {Object} Updated layout state
     *
     * @remarks
     * This method implements smart text processing:
     * - Preserves leading/trailing spaces by splitting on word boundaries
     * - Groups consecutive words into single Text objects for performance
     * - Only wraps on actual word boundaries, not arbitrary character positions
     * - Uses real PIXI Text measurements for accurate width calculations
     * - Handles edge cases like space-only text and overly long words
     */
    processTextElement(element, currentLine, lineHeight, currentY) {
        const style = this.resolveTextStyle(element.style);

        // Apply template value substitution FIRST
        const processedText = this.processTemplate(element.text);

        // Apply text transformation based on style
        const transformedText = this.applyTextTransform(processedText, element.style);

        // Handle completely empty text
        if (transformedText.length === 0) {
            return { currentLine, lineHeight, currentY };
        }

        // Special case: text is only whitespace (spaces, tabs, etc.)
        if (transformedText.trim().length === 0) {
            // Create space-only text object to preserve spacing
            const textObj = this.createText(transformedText, style);
            currentLine.push({
                element: textObj,
                width: textObj.width,
                height: textObj.height,
            });
            return {
                currentLine,
                lineHeight: Math.max(lineHeight, textObj.height),
                currentY,
            };
        }

        // Split text preserving all whitespace as separate tokens
        // This allows us to handle leading/trailing spaces correctly
        const parts = transformedText.split(/(\s+)/);
        const words = parts.filter(part => part.length > 0);
        let currentLineRef = currentLine;
        let currentHeightRef = lineHeight;
        let currentYRef = currentY;

        // Buffer to accumulate words before creating Text objects
        let wordBuffer = [];

        /**
         * Creates a Text object from buffered words and adds to current line
         * This optimization reduces the number of Text objects created
         */
        const flushBuffer = () => {
            if (wordBuffer.length === 0) return;

            // Join parts without adding spaces (they're already in the parts)
            const text = wordBuffer.join("");
            const textObj = this.createText(text, style);

            // Add to current line
            currentLineRef.push({
                element: textObj,
                width: textObj.width,
                height: textObj.height,
            });

            // Update line height and reset buffer
            currentHeightRef = Math.max(currentHeightRef, textObj.height);
            wordBuffer = [];
        };

        /**
         * Finalizes current line and starts a new one
         * Updates Y position based on line height and spacing
         */
        const wrapToNewLine = () => {
            // Finalize the current line
            this.finalizeLine(currentLineRef, currentHeightRef, currentYRef);
            // Move to next line position
            currentYRef += currentHeightRef + (this._defaultStyle.lineSpacing || 0);
            // Reset for new line
            currentLineRef = [];
            currentHeightRef = 0;
        };

        // Process each word/space part
        for (const part of words) {
            // Test if adding this part would exceed line width
            const testWords = [...wordBuffer, part];
            const testText = testWords.join(""); // Parts already contain spaces

            // Create temporary text to measure exact width
            const testTextObj = this.createText(testText, style);
            const testWidth = testTextObj.width;
            testTextObj.destroy(); // Important: clean up immediately

            // Calculate total width if we add this part
            const currentLineWidth = currentLineRef.reduce((sum, item) => sum + item.width, 0);
            const totalWidth = currentLineWidth + testWidth;
            const maxWidth = this._defaultStyle.wordWrapWidth || 300;

            // Don't wrap on spaces alone - they should stick to adjacent words
            const isSpaceOnly = /^\s+$/.test(part);

            // Check if we need to wrap to next line
            if (
                this._defaultStyle.wordWrap &&
                totalWidth > maxWidth &&
                !isSpaceOnly &&
                (currentLineRef.length > 0 || wordBuffer.length > 0)
            ) {
                // First, flush any accumulated words
                flushBuffer();

                // If current line still has content, wrap it
                if (currentLineRef.length > 0) {
                    wrapToNewLine();
                }

                // Start fresh with this part
                wordBuffer = [part];
            } else {
                // Add part to buffer - it fits on current line
                wordBuffer.push(part);
            }
        }

        // Flush any remaining buffered words
        flushBuffer();

        // Return updated layout state
        return {
            currentLine: currentLineRef,
            lineHeight: currentHeightRef,
            currentY: currentYRef,
        };
    }

    /**
     * Creates a PIXI display object from a TextBlock element
     *
     * @private
     * @param {Object} element - Element definition to create
     * @returns {Text|Sprite|null} Created PIXI object or null if creation failed
     *
     * @remarks
     * This method handles different element types:
     * - Text elements become PIXI Text objects with resolved styles
     * - Image elements become PIXI Sprite objects with optional scaling
     * - Returns null for invalid elements or missing resources
     */
    createElement(element) {
        if (element.type === "Text") {
            // Apply template value substitution
            const processedText = this.processTemplate(element.text);
            // Create Text object with resolved style
            const style = this.resolveTextStyle(element.style);
            const textObj = this.createText(processedText, style);

            return textObj;
        }

        if (element.type === "Image") {
            // Look up texture in resources
            const texture = this._resources.images[element.image];
            if (!texture) {
                console.warn(`Image not found: ${element.image}`);
                return null;
            }

            // Create sprite with optional scaling
            const sprite = new Sprite(texture);
            if (element.scale !== undefined) {
                sprite.scale.set(element.scale);
            }

            return sprite;
        }

        // Unknown element type
        console.warn(`Unknown element type: ${element.type}`);
        return null;
    }

    /**
     * Processes template substitution for dynamic text content
     *
     * @private
     * @param {string} text - Text that may contain {{key}} templates
     * @returns {string} Text with template values substituted
     *
     * @example
     * // With values = { name: "John", score: "1250" }
     * processTemplate("Hello {{name}}, your score is {{score}}!")
     * // Returns: "Hello John, your score is 1250!"
     *
     * @remarks
     * - Replaces {{key}} with corresponding values from this._resources.values
     * - Unknown keys are left as-is: {{unknown}} remains {{unknown}}
     * - Handles nested and complex key names
     */
    processTemplate(text) {
        return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            const value = this._resources.values[key];
            return value !== undefined ? String(value) : match;
        });
    }

    /**
     * Resolves a style configuration to PIXI-compatible TextStyleOptions
     *
     * @private
     * @param {Object|string} [style] - Style config or named style reference
     * @returns {Object} PIXI TextStyleOptions object
     *
     * @remarks
     * Style resolution process:
     * - Starts with default style base (filtering out custom properties)
     * - For named styles: looks up in this._resources.styles
     * - For direct styles: merges with defaults
     * - Custom layout properties are filtered out for PIXI compatibility
     */
    resolveTextStyle(style) {
        // Extract only PIXI-compatible properties from default style
        const {
            wordWrap,
            wordWrapWidth,
            lineHeight,
            lineSpacing,
            align,
            vAlign,
            textTransform,
            size,
            alignItems,
            ...pixiStyle
        } = this._defaultStyle;

        // Suppress unused variable warnings for extracted layout properties
        void wordWrap;
        void wordWrapWidth;
        void lineHeight;
        void lineSpacing;
        void align;
        void vAlign;
        void textTransform;
        void size;
        void alignItems;

        // Use defaults if no style specified
        if (!style) return pixiStyle;

        // Handle named style references
        if (typeof style === "string") {
            const namedStyle = this._resources.styles?.[style];
            if (!namedStyle) {
                console.warn(`Style not found: ${style}`);
                return pixiStyle;
            }
            // Merge named style with defaults
            return { ...pixiStyle, ...namedStyle };
        }

        // Handle direct style objects
        return { ...pixiStyle, ...style };
    }

    /**
     * Finalizes a line and adds it to lines array
     *
     * @private
     * @param {Array} elements - Elements on this line
     * @param {number} height - Maximum height of elements
     * @param {number} y - Y position of the line
     *
     * @remarks
     * This method creates a LineInfo record for positioning phase:
     * - Calculates total line width
     * - Adjusts height based on lineHeight multiplier
     * - Stores line position for later alignment calculations
     */
    finalizeLine(elements, height, y) {
        // Skip empty lines
        if (elements.length === 0) return;

        // Calculate total width by summing element widths
        let width = elements.reduce((sum, item) => sum + item.width, 0);

        // For right and justify alignment, trim trailing spaces from the last text element
        if (
            (this._defaultStyle.align === "right" || this._defaultStyle.align === "justify") &&
            elements.length > 0
        ) {
            const lastElement = elements[elements.length - 1];
            if (lastElement.element instanceof Text) {
                const originalText = lastElement.element.text;
                const trimmedText = originalText.replace(/\s+$/, "");

                if (originalText !== trimmedText) {
                    // Recalculate width for trimmed text
                    const style = lastElement.element.style;
                    const tempText = this.createText(trimmedText, style);
                    const newWidth = tempText.width;
                    tempText.destroy();

                    console.log(
                        `✂️ TRIM DEBUG: Original="${originalText}" -> Trimmed="${trimmedText}", width: ${lastElement.width} -> ${newWidth}`,
                    );

                    // Update the element's text and dimensions
                    lastElement.element.text = trimmedText;
                    const widthDifference = lastElement.width - newWidth;
                    lastElement.width = newWidth;
                    width -= widthDifference;
                }
            }
        }

        // Apply line height multiplier to the natural height
        const adjustedHeight = height * (this._defaultStyle.lineHeight || 1.2);

        // Store line information for positioning phase
        this._lines.push({
            elements: [...elements], // Copy array to avoid mutation
            width,
            height: adjustedHeight,
            y,
        });
    }

    /**
     * Phase 2: Positions all elements with proper alignment
     * Handles horizontal alignment for lines and calls positionElement for vertical alignment within lines
     *
     * @private
     *
     * @remarks
     * This phase takes the calculated lines and applies final positioning:
     * - Calculates container dimensions for alignment reference
     * - Applies horizontal alignment (left/center/right/justify) per line
     * - Vertical alignment is handled per-element within each line in positionElement
     * - Adds all elements to the PIXI display tree
     */
    positionElements() {
        // Calculate content dimensions
        const contentWidth =
            this._defaultStyle.align === "justify"
                ? this._defaultStyle.wordWrapWidth || 300
                : Math.max(...this._lines.map(line => line.width));

        const contentHeight = this._lines.reduce(
            (sum, line, index) =>
                sum +
                line.height +
                (index < this._lines.length - 1 ? this._defaultStyle.lineSpacing || 0 : 0),
            0,
        );

        // Determine container dimensions
        const containerWidth = this._defaultStyle.size?.width || contentWidth;
        const containerHeight = this._defaultStyle.size?.height || contentHeight;

        // Calculate content offset based on alignItems
        let contentOffsetX = 0;
        let contentOffsetY = 0;

        const alignItems = this._defaultStyle.alignItems || { x: "left", y: "top" };

        // Horizontal alignment of content within container
        if (alignItems.x === "center") {
            contentOffsetX = (containerWidth - contentWidth) / 2;
        } else if (alignItems.x === "right") {
            contentOffsetX = containerWidth - contentWidth;
        }

        // Vertical alignment of content within container
        if (alignItems.y === "center") {
            contentOffsetY = (containerHeight - contentHeight) / 2;
        } else if (alignItems.y === "bottom") {
            contentOffsetY = containerHeight - contentHeight;
        }

        // Process each line for horizontal alignment
        for (const line of this._lines) {
            let currentX = contentOffsetX; // Start with content offset
            const hAlign = this._defaultStyle.align || "left";

            // Calculate initial X offset based on horizontal alignment of lines
            if (hAlign === "center") {
                currentX += (contentWidth - line.width) / 2;
            } else if (hAlign === "right") {
                currentX += contentWidth - line.width;
            } else if (hAlign === "justify" && line.elements.length > 1) {
                // Justify: distribute extra space between elements
                const extraSpace = contentWidth - line.width;
                const gaps = line.elements.length - 1;
                const extraSpacePerGap = gaps > 0 ? extraSpace / gaps : 0;

                console.log(
                    `🔧 JUSTIFY DEBUG: lineWidth=${line.width}, contentWidth=${contentWidth}, extraSpace=${extraSpace}, extraSpacePerGap=${extraSpacePerGap}`,
                );

                // Position elements with extra spacing
                for (let i = 0; i < line.elements.length; i++) {
                    const layoutElement = line.elements[i];
                    this.positionElement(
                        layoutElement,
                        currentX,
                        line.y + contentOffsetY,
                        line.height,
                    );
                    currentX += layoutElement.width + (i < gaps ? extraSpacePerGap : 0);
                }
                continue; // Skip normal positioning for justified lines
            }

            // Normal positioning for non-justified lines
            for (const layoutElement of line.elements) {
                this.positionElement(layoutElement, currentX, line.y + contentOffsetY, line.height);
                currentX += layoutElement.width;
            }
        }
    }

    /**
     * Positions a single element within a line with vertical alignment
     *
     * @private
     * @param {Object} layoutElement - Layout element to position
     * @param {number} x - X position within the line
     * @param {number} lineY - Y position of the line
     * @param {number} lineHeight - Height of the line for vertical alignment
     *
     * @remarks
     * The vAlign property controls how elements are positioned vertically within each line:
     * - "top": Aligns elements to top of line
     * - "middle": Centers elements vertically within line
     * - "bottom": Aligns elements to bottom of line
     * - "baseline": Aligns text baselines (for text elements)
     */
    positionElement(layoutElement, x, lineY, lineHeight) {
        const element = layoutElement.element;
        const vAlign = this._defaultStyle.vAlign || "top";

        let elementY = lineY;

        // Calculate vertical alignment within the line
        if (vAlign === "middle") {
            elementY += (lineHeight - layoutElement.height) / 2;
        } else if (vAlign === "bottom") {
            elementY += lineHeight - layoutElement.height;
        } else if (vAlign === "baseline" && element instanceof Text) {
            // For text, align based on font metrics
            // This is a simplified baseline alignment
            const fontMetrics = element.style.fontSize || 16;
            elementY += lineHeight - fontMetrics * 0.8; // Approximate baseline
        }

        // Set final position
        element.position.set(x, elementY);

        // Add to display tree
        this.addChild(element);
    }

    createText(text, style) {
        // Convert v7 strokeThickness to v8 stroke format
        if (style && style.strokeThickness) {
            const color = style.stroke;
            const width = style.strokeThickness;
            style = { ...style };
            delete style.strokeThickness;
            if (width > 0 && color) {
                style.stroke = { color, width };
            } else {
                delete style.stroke;
            }
        }

        const textObj = new Text({ text, style });

        textObj.resolution = 2;

        return textObj;
    }
}
