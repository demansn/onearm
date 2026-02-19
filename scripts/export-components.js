// exportFigmaComponents.js

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const FIGMA_TOKEN = process.env.FIGMA_TOKEN;
const FILE_KEY = process.env.FILE_KEY;
const OUTPUT_DIR = path.join(__dirname, '../assets');

/**
 * Mapping Figma node types to Pixi components
 */
const NODE_TYPE_MAPPING = {
    'GROUP': 'SuperContainer',
    'FRAME': 'AutoLayout', 
    'COMPONENT': 'Component',
    'COMPONENT_SET': 'Component',
    'INSTANCE': 'Component',
    'TEXT': 'Text',
    'RECTANGLE': 'Rectangle',
    'ELLIPSE': 'Ellipse',
    'VECTOR': 'Graphics'
};

/**
 * Extract layout properties from AutoLayout nodes
 */
function extractAutoLayoutProps(node) {
    if (node.type !== 'FRAME' || !node.layoutMode) {
        return {};
    }

    const props = {
        flow: node.layoutMode.toLowerCase(), // VERTICAL, HORIZONTAL
    };

    if (node.itemSpacing !== undefined) {
        props.gap = node.itemSpacing;
    }

    props.contentAlign = {
        x: 'left',
        y: 'top',
    };

    if (node.primaryAxisAlignItems) {
        props.contentAlign.x = node.primaryAxisAlignItems.toLowerCase();
    }
    if (node.counterAxisAlignItems) {
        props.contentAlign.y = node.counterAxisAlignItems.toLowerCase(); 
    }

    return props;
}

/**
 * Convert Figma color to hex string
 */
function colorToHex(color) {
    const toHex = (value) => Math.round(value * 255).toString(16).padStart(2, '0');
    return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

/**
 * Extract fill properties from node
 */
function extractFillProps(node) {
    if (!node.fills || node.fills.length === 0) {
        return {};
    }

    // Find first visible fill
    const fills = node.fills.filter(({visible}) => visible !== false);
    const fill = fills[fills.length - 1];
    if (!fill) {
        return {};
    }
    
    // Handle solid fills
    if (fill.type === 'SOLID' && fill.color) {
        // For Rectangle use 'color', for Text use 'fill'
        const colorProperty = node.type === 'RECTANGLE' ? 'color' : 'fill';
        const props = { [colorProperty]: colorToHex(fill.color) };
        
        // Add opacity if it's not fully opaque - check both fill opacity and color alpha
        if (fill.opacity !== undefined && fill.opacity !== 1) {
            props.alpha = fill.opacity;
        } else if (fill.color.a !== undefined && fill.color.a !== 1) {
            props.alpha = fill.color.a;
        }
        
        return props;
    }
    
    // Handle gradient fills
    if ((fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL' || fill.type === 'GRADIENT_ANGULAR') && 
        fill.gradientStops && fill.gradientStops.length > 0) {
        
        if (node.type === 'TEXT') {
            // For Text: full gradient support (PIXI.TextStyle format)
            const colors = fill.gradientStops.map(stop => colorToHex(stop.color));
            const stops = fill.gradientStops.map(stop => stop.position);
            
            const props = {
                fill: colors,
                fillGradientStops: stops
            };
            
            // Add opacity if it's not fully opaque
            if (fill.opacity !== undefined && fill.opacity !== 1) {
                props.alpha = fill.opacity;
            }
            
            return props;
        } else {
            // For Rectangle: use first color only
            const firstStop = fill.gradientStops[0];
            if (firstStop.color) {
                const props = { color: colorToHex(firstStop.color) };
                
                // Add opacity if it's not fully opaque
                if (fill.opacity !== undefined && fill.opacity !== 1) {
                    props.alpha = fill.opacity;
                } else if (firstStop.color.a !== undefined && firstStop.color.a !== 1) {
                    props.alpha = firstStop.color.a;
                }
                
                return props;
            }
        }
    }

    return {};
}

/**
 * Extract stroke properties from node
 */
function extractStrokeProps(node) {
    const props = {};

    // Find first visible stroke
    if (node.strokes && node.strokes.length > 0) {
        const stroke = node.strokes.find(s => s.visible !== false);
        if (stroke) {
            // Handle solid strokes
            if (stroke.type === 'SOLID' && stroke.color) {
                props.stroke = colorToHex(stroke.color);
            }
            // Handle gradient strokes (for Text only)
            else if (node.type === 'TEXT' && 
                     (stroke.type === 'GRADIENT_LINEAR' || stroke.type === 'GRADIENT_RADIAL' || stroke.type === 'GRADIENT_ANGULAR') && 
                     stroke.gradientStops && stroke.gradientStops.length > 0) {
                
                const colors = stroke.gradientStops.map(stop => colorToHex(stop.color));
                props.stroke = colors;
                
                if (stroke.gradientStops.length > 1) {
                    const stops = stroke.gradientStops.map(stop => stop.position);
                    props.strokeGradientStops = stops;
                }
            }
        }
    }

    if (node.strokeWeight !== undefined) {
        // For Text use 'strokeWidth' (PIXI v8 TextStyle stroke object), for others use 'strokeWidth'
        props.strokeWidth = node.strokeWeight;
    }

    return props;
}

/**
 * Extract corner radius properties
 */
function extractCornerProps(node) {
    const props = {};

    if (node.cornerRadius !== undefined) {
        props.cornerRadius = node.cornerRadius;
    }

    if (node.rectangleCornerRadii) {
        const [tl, tr, br, bl] = node.rectangleCornerRadii;
        props.cornerRadius = { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl };
    }

    return props;
}

/**
 * Extract text style properties
 */
function extractTextProps(node) {
    if (node.type !== 'TEXT') {
        return {};
    }

    const props = {
        text: node.characters || '',
    };

    const style = {};

    if (node.style) {
        if (node.style.fontFamily) style.fontFamily = node.style.fontFamily;
        if (node.style.fontSize) style.fontSize = node.style.fontSize;
        if (node.style.fontWeight) style.fontWeight = node.style.fontWeight;
        if (node.style.letterSpacing) style.letterSpacing = node.style.letterSpacing;
        
        // Text alignment
        if (node.style.textAlignHorizontal) {
            // Convert Figma alignment to standard values
            const alignMap = {
                'LEFT': 'left',
                'CENTER': 'center',
                'RIGHT': 'right',
                'JUSTIFIED': 'justify'
            };
            style.align = alignMap[node.style.textAlignHorizontal] || 'left';
        }
    }
    // Text-specific fill
    Object.assign(style, extractFillProps(node));
    Object.assign(style, extractStrokeProps(node));

    props.style = style;

    return props;
}

/**
 * Extract constraints (layout constraints)
 */
function extractConstraints(node) {
    if (!node.constraints) {
        return {};
    }

    const constraints = {};
    
    if (node.constraints.horizontal) {
        constraints.horizontalConstraint = node.constraints.horizontal;
    }
    
    if (node.constraints.vertical) {
        constraints.verticalConstraint = node.constraints.vertical;
    }

    return constraints;
}

/**
 * Calculate text anchor and adjusted coordinates based on constraints
 * @param {Object} node - Figma text node
 * @param {Object} parentBounds - Parent bounding box
 * @returns {Object} Anchor and coordinate adjustments
 */
function calculateTextPositioning(node, parentBounds) {
    if (node.type !== 'TEXT' || !node.constraints || !node.absoluteBoundingBox) {
        return {};
    }

    const result = {};
    const textBounds = node.absoluteBoundingBox;
    
    // Calculate anchor based on horizontal constraint
    if (node.constraints.horizontal) {
        switch (node.constraints.horizontal) {
            case 'LEFT':
                result.anchorX = 0; // Left edge
                break;
            case 'CENTER':
                result.anchorX = 0.5; // Center
                break;
            case 'RIGHT':
                result.anchorX = 1; // Right edge
                break;
            case 'LEFT_RIGHT':
                result.anchorX = 0; // Default to left for stretch
                break;
            case 'SCALE':
                result.anchorX = 0.5; // Center for scale (better for text)
                break;
            default:
                result.anchorX = 0;
        }
    }

    // Calculate anchor based on vertical constraint
    if (node.constraints.vertical) {
        switch (node.constraints.vertical) {
            case 'TOP':
                result.anchorY = 0; // Top edge
                break;
            case 'CENTER':
                result.anchorY = 0.5; // Center
                break;
            case 'BOTTOM':
                result.anchorY = 1; // Bottom edge
                break;
            case 'TOP_BOTTOM':
                result.anchorY = 0; // Default to top for stretch
                break;
            case 'SCALE':
                result.anchorY = 0.5; // Center for scale (better for text)
                break;
            default:
                result.anchorY = 0;
        }
    }

    // Adjust coordinates based on anchor point
    if (parentBounds && (result.anchorX !== undefined || result.anchorY !== undefined)) {
        const relativeX = textBounds.x - parentBounds.x;
        const relativeY = textBounds.y - parentBounds.y;

        if (result.anchorX !== undefined) {
            // Adjust X coordinate to account for anchor
            if (result.anchorX === 0.5) {
                // Center anchor: add half width to get center point
                result.adjustedX = Math.round(relativeX + textBounds.width / 2);
            } else if (result.anchorX === 1) {
                // Right anchor: add full width to get right edge
                result.adjustedX = Math.round(relativeX + textBounds.width);
            } else {
                // Left anchor (0): use original position
                result.adjustedX = Math.round(relativeX);
            }
        }

        if (result.anchorY !== undefined) {
            // Adjust Y coordinate to account for anchor
            if (result.anchorY === 0.5) {
                // Center anchor: add half height to get center point
                result.adjustedY = Math.round(relativeY + textBounds.height / 2);
            } else if (result.anchorY === 1) {
                // Bottom anchor: add full height to get bottom edge
                result.adjustedY = Math.round(relativeY + textBounds.height);
            } else {
                // Top anchor (0): use original position
                result.adjustedY = Math.round(relativeY);
            }
        }
    }

    return result;
}

/**
 * Extract common properties for all nodes
 * @param {Object} node - Figma node
 * @param {boolean} isRootLevel - Is this a root level component
 * @returns {Object} Common properties
 */
function extractCommonProps(node, isRootLevel = false) {
    let componentType;
    
    // Check if any element name ends with "Button" for AnimationButton type
    if (node.name && node.name.endsWith('Button')) {
        componentType = 'AnimationButton';
    } else if (isRootLevel) {
        componentType = 'ComponentContainer';
    } else if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET' || node.type === 'INSTANCE') {
        componentType = 'Component';
    } else {
        componentType = NODE_TYPE_MAPPING[node.type] || node.type;
    }

    const props = {
        name: node.name,
        type: componentType
    };

    // Position and size
    if (node.absoluteBoundingBox) {
        // ComponentContainer (root level) should not have position/size
        if (!isRootLevel) {
            props.x = Math.round(node.absoluteBoundingBox.x);
            props.y = Math.round(node.absoluteBoundingBox.y);
        }
        
        const shouldHaveSize = ['COMPONENT', 'INSTANCE', 'RECTANGLE', 'ELLIPSE'].includes(node.type);
        const shouldSkipSize = isRootLevel || componentType === 'SuperContainer' || componentType === 'Text';

        if (node.type === 'FRAME') {
            props.size = {};

            if (node.layoutSizingHorizontal !== 'HUG') {
                props.size.width = Math.round(node.absoluteBoundingBox.width);
            }
            if (node.layoutSizingVertical !== 'HUG') {
                props.size.height = Math.round(node.absoluteBoundingBox.height);
            }
        } else if (shouldHaveSize && !shouldSkipSize) {
            props.width = Math.round(node.absoluteBoundingBox.width);
            props.height = Math.round(node.absoluteBoundingBox.height);
        }
    }

    // Relative position within parent
    if (node.relativeTransform && !isRootLevel) {
        const transform = node.relativeTransform;
        if (transform.length >= 2) {
            props.localX = Math.round(transform[0][2]);
            props.localY = Math.round(transform[1][2]);
        }
    }

    // Visibility - only export if not true
    if (node.visible !== undefined && node.visible !== true) {
        props.visible = node.visible;
    }

    // Opacity - only export if not 1
    if (node.opacity !== undefined && node.opacity !== 1) {
        props.alpha = node.opacity;
    }

    // Layout constraints - removed
    // Object.assign(props, extractConstraints(node));

    // Rotation
    if (node.rotation !== undefined && node.rotation !== 0) {
        props.rotation = node.rotation;
    }

    // Scale calculation for non-root elements
    // Note: Figma API doesn't expose transform matrices in the public API
    // Scale information would need to be calculated differently or obtained from effects/constraints

    return props;
}

/**
 * Extract variant properties from component
 * @param {Object} node - Figma component node
 * @returns {Object} Variant properties
 */
function extractVariantProps(node) {
    const variants = {};
    
    if (node.componentProperties) {
        Object.entries(node.componentProperties).forEach(([key, value]) => {
            variants[key] = value.value;
        });
    }
    
    return variants;
}

/**
 * Determine viewport type from variant properties or component name
 * @param {Object} variantProps - Variant properties
 * @param {string} componentName - Component name
 * @returns {string} Viewport type (default, portrait, landscape)
 */
function determineViewportType(variantProps, componentName) {
    const supportedViewports = ['default', 'portrait', 'landscape'];
    
    // Check variant properties for viewport information
    for (const [key, value] of Object.entries(variantProps)) {
        const lowerKey = key.toLowerCase();
        const lowerValue = value.toLowerCase();
        
        // Check if property name suggests viewport
        if (lowerKey.includes('viewport') || lowerKey.includes('orientation') || lowerKey.includes('layout')) {
            if (supportedViewports.includes(lowerValue)) {
                return lowerValue;
            }
        }
        
        // Check if value suggests viewport
        if (supportedViewports.includes(lowerValue)) {
            return lowerValue;
        }
    }
    
    // Check component name for viewport hints
    const lowerName = componentName.toLowerCase();
    for (const viewport of supportedViewports) {
        if (lowerName.includes(viewport)) {
            return viewport;
        }
    }
    
    return 'default';
}

/**
 * Extract variant information from component instance
 * @param {Object} node - Figma INSTANCE node
 * @returns {Object} Variant properties
 */
function extractInstanceVariant(node) {
    if (node.type !== 'INSTANCE') {
        return {};
    }
    
    const props = {};
    
    // Extract variant from component properties
    if (node.componentProperties) {
        const variantProps = extractVariantProps(node);
        
        // Determine which variant this instance represents
        const viewport = determineViewportType(variantProps, node.name);
        if (viewport !== 'default') {
            props.variant = viewport;
        }
    }
    
    // If no specific variant found, check the component name for hints
    if (!props.variant) {
        const componentName = node.name;
        const lowerName = componentName.toLowerCase();
        
        if (lowerName.includes('portrait')) {
            props.variant = 'portrait';
        } else if (lowerName.includes('landscape')) {
            props.variant = 'landscape';
        } else {
            props.variant = 'default';
        }
    }
    
    return props;
}

/**
 * Process component variants from COMPONENT_SET
 * @param {Object} componentSet - Figma COMPONENT_SET node
 * @param {Map} componentMap - Map of component IDs to component names
 * @returns {Object} Component configurations for each variant
 */
function processComponentVariants(componentSet, componentMap = new Map()) {
    const componentName = componentSet.name;
    
    if (!componentSet.children || componentSet.children.length === 0) {
        return null;
    }

    // Group variants by viewport configuration
    const viewportGroups = {
        default: [],
        portrait: [],
        landscape: []
    };

    // Process each variant component
    componentSet.children.forEach(variant => {
        if (variant.type !== 'COMPONENT') return;
        
        const variantProps = extractVariantProps(variant);
        const config = processNode(variant, null, true, componentMap);
        
        // Determine viewport based on variant properties and name
        const viewport = determineViewportType(variantProps, variant.name);
        
        viewportGroups[viewport].push({
            ...config,
            variantProps: Object.keys(variantProps).length > 0 ? variantProps : undefined
        });
    });

    // Create final configuration
    const componentType = componentName.endsWith('Button') ? 'AnimationButton' : 'ComponentContainer';
    const result = {
        name: componentName,
        type: componentType,
        variants: {}
    };

    // Add non-empty viewport configurations
    Object.entries(viewportGroups).forEach(([viewport, configs]) => {
        if (configs.length > 0) {
            // If there's only one config for this viewport, use it directly
            // Otherwise, keep all variants (in case there are other properties)
            if (configs.length === 1) {
                const config = configs[0];
                // Remove name and type from variant config, keep only layout properties
                const { name, type, ...variantConfig } = config;
                result.variants[viewport] = variantConfig;
                // Clean up variantProps if it's undefined
                if (!result.variants[viewport].variantProps) {
                    delete result.variants[viewport].variantProps;
                }
            } else {
                result.variants[viewport] = configs.map(config => {
                    const { name, type, ...variantConfig } = config;
                    return variantConfig;
                });
            }
        }
    });

    // If no specific viewports were found, but we have variants, put them in default
    const hasSpecificViewports = Object.keys(result.variants).length > 0;
    
    if (!hasSpecificViewports && componentSet.children.length > 0) {
        // Use the first variant as default
        const firstVariant = componentSet.children.find(child => child.type === 'COMPONENT');
        if (firstVariant) {
            const config = processNode(firstVariant, null, true, componentMap);
            const { name, type, ...variantConfig } = config;
            result.variants.default = variantConfig;
        }
    }

    return result;
}

/**
 * Create a map of component IDs to component info (name and size) for resolving instance types and scale
 * @param {Object} node - Figma node to traverse
 * @param {Map} componentMap - Map to populate
 */
function buildComponentMap(node, componentMap = new Map(), parentIsComponentSet = false) {
    // Add this component to the map if it's a component, but skip variants inside component sets
    if ((node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') && node.id && node.name && !parentIsComponentSet) {
        const componentInfo = {
            name: node.name,
            width: node.absoluteBoundingBox ? node.absoluteBoundingBox.width : 0,
            height: node.absoluteBoundingBox ? node.absoluteBoundingBox.height : 0
        };
        componentMap.set(node.id, componentInfo);
    }
    
    // If it's a component set, also add individual variants
    if (node.type === 'COMPONENT_SET' && node.children) {
        node.children.forEach(variant => {
            if (variant.type === 'COMPONENT' && variant.id) {
                const componentInfo = {
                    name: node.name, // Use parent component set name
                    width: variant.absoluteBoundingBox ? variant.absoluteBoundingBox.width : 0,
                    height: variant.absoluteBoundingBox ? variant.absoluteBoundingBox.height : 0
                };
                componentMap.set(variant.id, componentInfo);
            }
        });
    }
    
    // Recursively process children
    if (node.children) {
        const isComponentSet = node.type === 'COMPONENT_SET';
        node.children.forEach(child => buildComponentMap(child, componentMap, isComponentSet));
    }
    
    return componentMap;
}

/**
 * Process a single Figma node and convert to component config
 * @param {Object} node - Figma node
 * @param {Object} parentBounds - Parent bounding box
 * @param {boolean} isRootLevel - Is this a root level component
 * @param {Map} componentMap - Map of component IDs to component names
 * @returns {Object} Component configuration
 */
function processNode(node, parentBounds = null, isRootLevel = false, componentMap = new Map()) {
    // For component instances, export only essential properties (x, y, scale)
    if (node.type === 'INSTANCE') {
        // Get the parent component info from componentMap using componentId
        let parentComponentInfo = { name: 'Component', width: 0, height: 0 }; // fallback
        if (node.componentId && componentMap.has(node.componentId)) {
            parentComponentInfo = componentMap.get(node.componentId);
        }
        
        const props = {
            name: node.name,
            type: parentComponentInfo.name,
            isInstance: true
        };
        
        // Position
        if (parentBounds && node.absoluteBoundingBox) {
            props.x = Math.round(node.absoluteBoundingBox.x - parentBounds.x);
            props.y = Math.round(node.absoluteBoundingBox.y - parentBounds.y);
        }
        
        // Calculate scale based on size difference between instance and original component
        if (node.absoluteBoundingBox && parentComponentInfo.width > 0 && parentComponentInfo.height > 0) {
            const instanceWidth = node.absoluteBoundingBox.width;
            const instanceHeight = node.absoluteBoundingBox.height;
            const originalWidth = parentComponentInfo.width;
            const originalHeight = parentComponentInfo.height;
            
            const scaleX = instanceWidth / originalWidth;
            const scaleY = instanceHeight / originalHeight;
            
            // Only export scale if it's different from 1 (with small tolerance for floating point errors)
            if (Math.abs(scaleX - 1) > 0.001 || Math.abs(scaleY - 1) > 0.001) {
                if (Math.abs(scaleX - scaleY) < 0.001) {
                    // Uniform scale
                    props.scale = Math.round(scaleX * 1000) / 1000;
                } else {
                    // Non-uniform scale
                    props.scale = {
                        x: Math.round(scaleX * 1000) / 1000,
                        y: Math.round(scaleY * 1000) / 1000
                    };
                }
            }
        }
        
        // Variant information
        Object.assign(props, extractInstanceVariant(node));
        
        return props;
    }
    
    // Special handling for placeholder objects ending with "_ph"
    if (node.name && node.name.endsWith('_ph')) {
        const props = {
            name: node.name,
            type: 'SuperContainer'
        };
        
        // Calculate center coordinates
        if (node.absoluteBoundingBox) {
            const centerX = node.absoluteBoundingBox.x + node.absoluteBoundingBox.width / 2;
            const centerY = node.absoluteBoundingBox.y + node.absoluteBoundingBox.height / 2;
            
            if (parentBounds) {
                // Relative to parent
                props.x = Math.round(centerX - parentBounds.x);
                props.y = Math.round(centerY - parentBounds.y);
            } else {
                // Absolute coordinates
                props.x = Math.round(centerX);
                props.y = Math.round(centerY);
            }
        }
        
        return props;
    }
    
    const props = extractCommonProps(node, isRootLevel);
    
    // Adjust position relative to parent
    if (parentBounds && node.absoluteBoundingBox) {
        props.x = Math.round(node.absoluteBoundingBox.x - parentBounds.x);
        props.y = Math.round(node.absoluteBoundingBox.y - parentBounds.y);
    }

    // Extract type-specific properties based on original node type
    switch (node.type) {
        case 'FRAME':
            Object.assign(props, extractAutoLayoutProps(node));
            break;
        case 'TEXT':
            Object.assign(props, extractTextProps(node));
            
            // Calculate text positioning based on constraints
            const textPositioning = calculateTextPositioning(node, parentBounds);
            if (textPositioning.anchorX !== undefined) {
                props.anchorX = textPositioning.anchorX;
            }
            if (textPositioning.anchorY !== undefined) {
                props.anchorY = textPositioning.anchorY;
            }
            
            // Override coordinates with adjusted ones if available
            if (textPositioning.adjustedX !== undefined) {
                props.x = textPositioning.adjustedX;
            }
            if (textPositioning.adjustedY !== undefined) {
                props.y = textPositioning.adjustedY;
            }
            break;
        case 'RECTANGLE':
            Object.assign(props, extractFillProps(node));
            Object.assign(props, extractStrokeProps(node));
            Object.assign(props, extractCornerProps(node));
            break;
        case 'ELLIPSE':
            Object.assign(props, extractFillProps(node));
            Object.assign(props, extractStrokeProps(node));
            break;
        case 'VECTOR':
            Object.assign(props, extractFillProps(node));
            Object.assign(props, extractStrokeProps(node));
            break;
        case 'GROUP':
            // Groups typically don't have visual properties
            break;
        case 'COMPONENT':
        case 'COMPONENT_SET':
            break;
        case 'INSTANCE':
            // Extract variant information for component instances
            Object.assign(props, extractInstanceVariant(node));
            break;
    }

    // Process children logic:
    // - Root level (SuperContainer): always export all children
    // - Non-root GROUP, FRAME: export children recursively (containers)
    // - Non-root COMPONENT, INSTANCE: never export children (custom Pixi classes)
    // - Other types: export children normally
    let shouldExportChildren;
    
    if (isRootLevel) {
        // Root level SuperContainer: always export all children
        shouldExportChildren = true;
    } else {
        // Non-root: apply type-based logic
        shouldExportChildren = node.type === 'GROUP' || 
                              node.type === 'FRAME' || 
                              (node.type !== 'COMPONENT' && 
                               node.type !== 'COMPONENT_SET' && 
                               node.type !== 'INSTANCE');
    }

    if (node.children && node.children.length > 0 && shouldExportChildren) {
        const processedChildren = node.children
            .filter(child => child.name !== 'screen') // Filter out "screen" components
            .map(child => processNode(child, node.absoluteBoundingBox, false, componentMap));
        
        // All components use regular children
        props.children = processedChildren;
    }

    return props;
}

async function main() {
    try {
        console.log('Начинаем экспорт компонентов из Figma...');
        
        const targetPage = 'layouts';
        const figmaData = await getFigmaFile(FILE_KEY);
        const document = figmaData.document;
        const componentsPage = document.children.find(child => child.name === targetPage);
        
        if (!componentsPage) {
            throw new Error(`Не найдена страница с именем "${targetPage}" в файле Figma`);
        }

        // Build component map for resolving instance types
        console.log('Создаем карту компонентов...');
        const componentMap = buildComponentMap(document);
        console.log(`Найдено компонентов: ${componentMap.size}`);

        const components = [];
        
        // Process all root components on the page
        for (const child of componentsPage.children) {
            // Skip components with name "screen"
            if (child.name === 'screen') {
                console.log(`Пропускаем компонент: ${child.name}`);
                continue;
            }
            
            console.log(`Обрабатываем компонент: ${child.name}`);
            
            let componentConfig;
            
            // Check if this is a component set with variants
            if (child.type === 'COMPONENT_SET') {
                console.log(`  Найден COMPONENT_SET с вариантами`);
                componentConfig = processComponentVariants(child, componentMap);
                
                if (componentConfig) {
                    const variantCount = componentConfig.variants ? Object.keys(componentConfig.variants).length : 0;
                    console.log(`  Экспортировано вариантов: ${variantCount}`);
                }
            } else {
                // Regular component without variants - wrap in default variant structure
                const nodeConfig = processNode(child, null, true, componentMap); // isRootLevel = true
                const { name, type, ...variantConfig } = nodeConfig;
                const componentType = child.name.endsWith('Button') ? 'AnimationButton' : 'ComponentContainer';
                componentConfig = {
                    name: nodeConfig.name,
                    type: componentType,
                    variants: {
                        default: variantConfig
                    }
                };
            }
            
            if (componentConfig) {
                components.push(componentConfig);
            }
        }

        // Generate statistics  
        const componentsWithMultipleVariants = components.filter(c => {
            if (!c.variants) return false;
            const variantKeys = Object.keys(c.variants);
            return variantKeys.length > 1; // More than just 'default'
        });
        
        const stats = {
            totalComponents: components.length,
            componentsWithVariants: componentsWithMultipleVariants.length,
            componentsWithoutVariants: components.length - componentsWithMultipleVariants.length
        };

        // Count variants by viewport
        const variantStats = { default: 0, portrait: 0, landscape: 0 };
        components.forEach(component => {
            // All components now have variants object
            if (component.variants) {
                Object.keys(component.variants).forEach(key => {
                    if (variantStats.hasOwnProperty(key)) {
                        variantStats[key]++;
                    }
                });
            }
        });

        // Generate configurations
        const config = {
            components,
            metadata: {
                exportedAt: new Date().toISOString(),
                figmaFileKey: FILE_KEY,
                statistics: {
                    ...stats,
                    variantsByViewport: variantStats
                }
            }
        };

        // Ensure output directory exists
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        // Save JSON config
        const jsonPath = path.join(OUTPUT_DIR, 'components.config.json');
        const formattedJSON = JSON.stringify(config, null, 2);
        await fs.promises.writeFile(jsonPath, formattedJSON);

        console.log(`\nКонфигурация компонентов сохранена:`);
        console.log(`  JSON: ${jsonPath}`);
        console.log(`\nСтатистика экспорта:`);
        console.log(`  Всего компонентов: ${stats.totalComponents}`);
        console.log(`  С вариантами: ${stats.componentsWithVariants}`);
        console.log(`  Без вариантов: ${stats.componentsWithoutVariants}`);
        
        if (stats.componentsWithVariants > 0) {
            console.log(`\nВарианты по вьюпортам:`);
            Object.entries(variantStats).forEach(([viewport, count]) => {
                if (count > 0) {
                    console.log(`  ${viewport}: ${count}`);
                }
            });
        }
        
        console.log('\nЭкспорт завершён!');
        
    } catch (error) {
        console.error('Ошибка:', error.message);
    }
}



async function getFigmaFile(fileKey) {
    const url = `https://api.figma.com/v1/files/${fileKey}`;
    const response = await fetch(url, {
        headers: { 'X-Figma-Token': FIGMA_TOKEN }
    });
    if (!response.ok) {
        throw new Error(`Ошибка получения файла: ${response.statusText}`);
    }
    return await response.json();
}


main();