import { parseDocument } from "htmlparser2";

/**
 * XML Parser for TextBlock component
 * Converts XML format to TextBlock configuration object
 *
 * @example
 * ```javascript
 * const xmlString = `
 *   <TextBlock wordWrap="true" wordWrapWidth="800" align="center" vAlign="top">
 *     <Text style='InfoPageText'>Hello {{name}}</Text>
 *     <Sprite image="{{icon}}" scale='0.5' />
 *     <br/>
 *   </TextBlock>
 * `;
 *
 * const config = TextBlockXMLParser.parse(xmlString, { name: "World", icon: "PlusButton" });
 * const textBlock = new TextBlock(config);
 * ```
 */
export class TextBlockXMLParser {
    /**
     * Parse XML string into TextBlock configuration
     *
     * @param {string} xmlString - XML string to parse
     * @param {Object} [values] - Optional values for {{key}} template replacement
     * @returns {Object} TextBlock configuration object
     */
    static parse(xmlString, values = {}) {
        // Apply template replacement before parsing
        const processedXML = this.processTemplates(xmlString, values);

        // Parse with case-sensitive option for attributes
        const doc = parseDocument(processedXML, {
            lowerCaseAttributeNames: false,
            xmlMode: true,
        });

        // Find TextBlock element recursively
        const textBlockElement = this.findTextBlockElement(doc);

        if (!textBlockElement) {
            throw new Error("TextBlock root element not found");
        }

        const config = {
            elements: [],
            style: {},
        };

        // Parse TextBlock attributes
        config.style = this.parseTextBlockAttributes(textBlockElement.attribs || {});

        // Parse child elements
        this.parseElements(textBlockElement.children, config.elements);

        return config;
    }

    /**
     * Process template variables in XML string
     *
     * @private
     * @param {string} xmlString - XML string with {{key}} templates
     * @param {Object} values - Values for template replacement
     * @returns {string} Processed XML string
     */
    static processTemplates(xmlString, values) {
        return xmlString.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            const value = values[key];
            return value !== undefined ? String(value) : match;
        });
    }

    /**
     * Find TextBlock element in document tree
     *
     * @private
     * @param {Object} node - Document or element node
     * @returns {Object|null} TextBlock element or null
     */
    static findTextBlockElement(node) {
        if (node.name && node.name.toLowerCase() === "textblock") {
            return node;
        }

        if (node.children) {
            for (const child of node.children) {
                const found = this.findTextBlockElement(child);
                if (found) return found;
            }
        }

        return null;
    }

    /**
     * Parse TextBlock root element attributes
     *
     * @private
     * @param {Object} attribs - Element attributes
     * @returns {Object} Style configuration
     */
    static parseTextBlockAttributes(attribs) {
        const style = {};

        // Parse boolean attributes
        if (attribs.wordWrap) {
            style.wordWrap = attribs.wordWrap === "true";
        }

        // Parse numeric attributes
        if (attribs.wordWrapWidth) {
            style.wordWrapWidth = parseInt(attribs.wordWrapWidth, 10);
        }

        if (attribs.lineHeight) {
            style.lineHeight = parseFloat(attribs.lineHeight);
        }

        if (attribs.lineSpacing) {
            style.lineSpacing = parseInt(attribs.lineSpacing, 10);
        }

        // Parse align and vAlign as string parameters
        if (attribs.align) {
            style.align = attribs.align;
        }

        if (attribs.vAlign) {
            style.vAlign = attribs.vAlign;
        }

        // Parse size attribute (format: "width,height" or "width x height")
        if (attribs.size) {
            const sizeMatch = attribs.size.match(/(\d+)\s*[,x]\s*(\d+)/);
            if (sizeMatch) {
                style.size = {
                    width: parseInt(sizeMatch[1], 10),
                    height: parseInt(sizeMatch[2], 10),
                };
            }
        }

        // Parse alignItems attribute (format: "horizontal,vertical" e.g., "center,top")
        if (attribs.alignItems) {
            const parts = attribs.alignItems.split(",").map(s => s.trim());
            if (parts.length === 2) {
                style.alignItems = {
                    x: parts[0],
                    y: parts[1],
                };
            } else if (parts.length === 1) {
                // If only one value provided, use it for both x and y
                style.alignItems = {
                    x: parts[0],
                    y: parts[0],
                };
            }
        }

        // Parse other common style properties
        if (attribs.fontSize) {
            style.fontSize = parseInt(attribs.fontSize, 10);
        }

        if (attribs.fill || attribs.color) {
            style.fill = this.parseColor(attribs.fill || attribs.color);
        }

        if (attribs.fontFamily) {
            style.fontFamily = attribs.fontFamily;
        }

        return style;
    }

    /**
     * Parse color value
     *
     * @private
     * @param {string} colorValue - Color as string
     * @returns {number|string} Parsed color
     */
    static parseColor(colorValue) {
        if (colorValue.startsWith("#")) {
            return parseInt(colorValue.substring(1), 16);
        } else if (colorValue.startsWith("0x")) {
            return parseInt(colorValue, 16);
        } else if (!isNaN(colorValue)) {
            return parseInt(colorValue, 10);
        }
        return colorValue; // Return as string for named colors
    }

    /**
     * Parse child elements recursively
     *
     * @private
     * @param {Array} children - Array of child nodes
     * @param {Array} elements - Target elements array
     */
    static parseElements(children, elements) {
        if (!children) return;

        for (const child of children) {
            if (child.type === "text") {
                // Handle text nodes - preserve whitespace for proper spacing
                const text = child.data;
                if (text) {
                    // Only trim if the text is purely whitespace, otherwise preserve it
                    const trimmedText = text.trim();
                    if (trimmedText) {
                        elements.push({
                            type: "Text",
                            text: text, // Preserve original text including leading/trailing spaces
                        });
                    }
                }
            } else if (child.type === "tag") {
                const tagName = child.name.toLowerCase(); // Normalize to lowercase for comparison
                if (tagName === "text") {
                    // Handle Text elements
                    this.parseTextElement(child, elements);
                } else if (tagName === "br") {
                    // Handle line breaks
                    elements.push({ type: "NextLine" });
                } else if (tagName === "sprite") {
                    // Handle Sprite elements
                    this.parseSpriteElement(child, elements);
                } else {
                    // Unknown tag - log warning and skip
                    console.warn(`Unknown tag: ${child.name}`);
                }
            }
        }
    }

    /**
     * Parse Text element
     *
     * @private
     * @param {Object} element - Text element node
     * @param {Array} elements - Target elements array
     */
    static parseTextElement(element, elements) {
        const textElement = {
            type: "Text",
            text: "",
        };

        // Parse text content and child elements
        const textContent = this.extractMixedContent(element);

        if (textContent.length === 0) return;

        // Handle inline content (text mixed with images)
        for (const item of textContent) {
            if (item.type === "text") {
                if (item.content.trim()) {
                    const textEl = {
                        type: "Text",
                        text: item.content,
                    };

                    // Apply style from Text element attributes
                    const style = this.parseElementStyle(element.attribs || {});
                    if (Object.keys(style).length > 0) {
                        textEl.style = style;
                    }

                    elements.push(textEl);
                }
            } else if (item.type === "image") {
                elements.push(item.element);
            } else if (item.type === "break") {
                elements.push({ type: "NextLine" });
            }
        }
    }

    /**
     * Parse Sprite element
     *
     * @private
     * @param {Object} element - Sprite element node
     * @param {Array} elements - Target elements array
     */
    static parseSpriteElement(element, elements) {
        const attribs = element.attribs || {};

        // image attribute is required
        if (!attribs.image) {
            console.warn('Sprite element missing required "image" attribute');
            return;
        }

        const imageElement = {
            type: "Image",
            image: attribs.image,
        };

        // Parse optional scale attribute
        if (attribs.scale) {
            imageElement.scale = parseFloat(attribs.scale);
        }

        elements.push(imageElement);
    }

    /**
     * Extract mixed content (text and inline elements) from an element
     *
     * @private
     * @param {Object} element - Element to extract content from
     * @returns {Array} Array of content items
     */
    static extractMixedContent(element) {
        const content = [];

        // Recursively flatten all content from the element tree
        this.flattenElement(element, content);

        return content;
    }

    /**
     * Recursively flatten element content to handle incorrectly nested self-closing tags
     *
     * @private
     * @param {Object} element - Element to flatten
     * @param {Array} content - Content array to populate
     */
    static flattenElement(element, content) {
        for (const child of element.children || []) {
            if (child.type === "text") {
                // Split by line breaks in text
                const parts = child.data.split(/\r?\n/);
                for (let i = 0; i < parts.length; i++) {
                    if (i > 0) {
                        content.push({ type: "break" });
                    }
                    if (parts[i]) {
                        content.push({ type: "text", content: parts[i] });
                    }
                }
            } else if (child.type === "tag") {
                const tagName = child.name.toLowerCase(); // Normalize to lowercase for comparison
                if (tagName === "br") {
                    content.push({ type: "break" });
                } else if (tagName === "sprite") {
                    // Handle Sprite elements
                    const attribs = child.attribs || {};

                    if (attribs.image) {
                        const imageElement = {
                            type: "Image",
                            image: attribs.image,
                        };

                        if (attribs.scale) {
                            imageElement.scale = parseFloat(attribs.scale);
                        }

                        content.push({
                            type: "image",
                            element: imageElement,
                        });
                    } else {
                        console.warn('Sprite element missing required "image" attribute');
                    }

                    // Recursively process children (text that became incorrectly nested)
                    if (child.children && child.children.length > 0) {
                        this.flattenElement(child, content);
                    }
                } else {
                    console.warn(`Unknown inline tag: ${child.name}`);
                    // Still process children to recover any text content
                    if (child.children && child.children.length > 0) {
                        this.flattenElement(child, content);
                    }
                }
            }
        }
    }

    /**
     * Parse element style attributes
     *
     * @private
     * @param {Object} attribs - Element attributes
     * @returns {Object} Style object
     */
    static parseElementStyle(attribs) {
        const style = {};

        // Handle style attribute (named style)
        if (attribs.style) {
            return attribs.style; // Return as string for named style
        }

        // Parse individual style attributes
        if (attribs.fontSize) {
            style.fontSize = parseInt(attribs.fontSize, 10);
        }

        if (attribs.fill || attribs.color) {
            style.fill = this.parseColor(attribs.fill || attribs.color);
        }

        if (attribs.fontFamily) {
            style.fontFamily = attribs.fontFamily;
        }

        if (attribs.align) {
            style.align = attribs.align;
        }

        if (attribs.vAlign) {
            style.vAlign = attribs.vAlign;
        }

        if (attribs.fontWeight) {
            style.fontWeight = attribs.fontWeight;
        }

        return style;
    }
}
