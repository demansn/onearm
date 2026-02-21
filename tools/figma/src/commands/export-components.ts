import fs from 'fs';
import path from 'path';
import { FigmaAuth } from '../auth/FigmaAuth.js';
import { FigmaClient, FigmaNode } from '../api/FigmaClient.js';
import { findGameRoot } from '../utils/find-game-root.js';

const NODE_TYPE_MAPPING: Record<string, string> = {
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

interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface ComponentInfo {
    name: string;
    width: number;
    height: number;
}

function extractAutoLayoutProps(node: FigmaNode): Record<string, any> {
    if (node.type !== 'FRAME' || !node.layoutMode) return {};

    const props: Record<string, any> = {
        flow: node.layoutMode.toLowerCase(),
    };

    if (node.itemSpacing !== undefined) {
        props.gap = node.itemSpacing;
    }

    props.contentAlign = { x: 'left', y: 'top' };

    if (node.primaryAxisAlignItems) {
        props.contentAlign.x = node.primaryAxisAlignItems.toLowerCase();
    }
    if (node.counterAxisAlignItems) {
        props.contentAlign.y = node.counterAxisAlignItems.toLowerCase();
    }

    return props;
}

const toHex = (v: number): string => Math.round(v * 255).toString(16).padStart(2, '0');
const colorToHex = (color: { r: number; g: number; b: number }): string =>
    `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;

function extractFillProps(node: FigmaNode): Record<string, any> {
    if (!node.fills || node.fills.length === 0) return {};

    const fills = node.fills.filter(({ visible }: any) => visible !== false);
    const fill = fills[fills.length - 1];
    if (!fill) return {};

    if (fill.type === 'SOLID' && fill.color) {
        const colorProperty = node.type === 'RECTANGLE' ? 'color' : 'fill';
        const props: Record<string, any> = { [colorProperty]: colorToHex(fill.color) };

        if (fill.opacity !== undefined && fill.opacity !== 1) {
            props.alpha = fill.opacity;
        } else if (fill.color.a !== undefined && fill.color.a !== 1) {
            props.alpha = fill.color.a;
        }

        return props;
    }

    if ((fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL' || fill.type === 'GRADIENT_ANGULAR') &&
        fill.gradientStops && fill.gradientStops.length > 0) {

        if (node.type === 'TEXT') {
            const colors = fill.gradientStops.map((stop: any) => colorToHex(stop.color));
            const stops = fill.gradientStops.map((stop: any) => stop.position);
            const props: Record<string, any> = { fill: colors, fillGradientStops: stops };
            if (fill.opacity !== undefined && fill.opacity !== 1) {
                props.alpha = fill.opacity;
            }
            return props;
        } else {
            const firstStop = fill.gradientStops[0];
            if (firstStop.color) {
                const props: Record<string, any> = { color: colorToHex(firstStop.color) };
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

function extractStrokeProps(node: FigmaNode): Record<string, any> {
    const props: Record<string, any> = {};

    if (node.strokes && node.strokes.length > 0) {
        const stroke = node.strokes.find((s: any) => s.visible !== false);
        if (stroke) {
            if (stroke.type === 'SOLID' && stroke.color) {
                props.stroke = colorToHex(stroke.color);
            } else if (node.type === 'TEXT' &&
                (stroke.type === 'GRADIENT_LINEAR' || stroke.type === 'GRADIENT_RADIAL' || stroke.type === 'GRADIENT_ANGULAR') &&
                stroke.gradientStops && stroke.gradientStops.length > 0) {
                const colors = stroke.gradientStops.map((stop: any) => colorToHex(stop.color));
                props.stroke = colors;
                if (stroke.gradientStops.length > 1) {
                    props.strokeGradientStops = stroke.gradientStops.map((stop: any) => stop.position);
                }
            }
        }
    }

    if (node.strokeWeight !== undefined) {
        props.strokeWidth = node.strokeWeight;
    }

    return props;
}

function extractCornerProps(node: FigmaNode): Record<string, any> {
    const props: Record<string, any> = {};

    if (node.cornerRadius !== undefined) {
        props.cornerRadius = node.cornerRadius;
    }

    if (node.rectangleCornerRadii) {
        const [tl, tr, br, bl] = node.rectangleCornerRadii;
        props.cornerRadius = { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl };
    }

    return props;
}

function extractTextProps(node: FigmaNode): Record<string, any> {
    if (node.type !== 'TEXT') return {};

    const props: Record<string, any> = {
        text: node.characters || '',
    };

    const style: Record<string, any> = {};

    if (node.style) {
        if (node.style.fontFamily) style.fontFamily = node.style.fontFamily;
        if (node.style.fontSize) style.fontSize = node.style.fontSize;
        if (node.style.fontWeight) style.fontWeight = node.style.fontWeight;
        if (node.style.letterSpacing) style.letterSpacing = node.style.letterSpacing;

        if (node.style.textAlignHorizontal) {
            const alignMap: Record<string, string> = {
                'LEFT': 'left', 'CENTER': 'center', 'RIGHT': 'right', 'JUSTIFIED': 'justify'
            };
            style.align = alignMap[node.style.textAlignHorizontal] || 'left';
        }
    }

    Object.assign(style, extractFillProps(node));
    Object.assign(style, extractStrokeProps(node));
    props.style = style;

    return props;
}

function calculateTextPositioning(node: FigmaNode, parentBounds: BoundingBox | null): Record<string, any> {
    if (node.type !== 'TEXT' || !node.constraints || !node.absoluteBoundingBox) return {};

    const result: Record<string, any> = {};
    const textBounds = node.absoluteBoundingBox;

    if (node.constraints.horizontal) {
        switch (node.constraints.horizontal) {
            case 'LEFT': result.anchorX = 0; break;
            case 'CENTER': result.anchorX = 0.5; break;
            case 'RIGHT': result.anchorX = 1; break;
            case 'LEFT_RIGHT': result.anchorX = 0; break;
            case 'SCALE': result.anchorX = 0.5; break;
            default: result.anchorX = 0;
        }
    }

    if (node.constraints.vertical) {
        switch (node.constraints.vertical) {
            case 'TOP': result.anchorY = 0; break;
            case 'CENTER': result.anchorY = 0.5; break;
            case 'BOTTOM': result.anchorY = 1; break;
            case 'TOP_BOTTOM': result.anchorY = 0; break;
            case 'SCALE': result.anchorY = 0.5; break;
            default: result.anchorY = 0;
        }
    }

    if (parentBounds && (result.anchorX !== undefined || result.anchorY !== undefined)) {
        const relativeX = textBounds.x - parentBounds.x;
        const relativeY = textBounds.y - parentBounds.y;

        if (result.anchorX !== undefined) {
            if (result.anchorX === 0.5) {
                result.adjustedX = Math.round(relativeX + textBounds.width / 2);
            } else if (result.anchorX === 1) {
                result.adjustedX = Math.round(relativeX + textBounds.width);
            } else {
                result.adjustedX = Math.round(relativeX);
            }
        }

        if (result.anchorY !== undefined) {
            if (result.anchorY === 0.5) {
                result.adjustedY = Math.round(relativeY + textBounds.height / 2);
            } else if (result.anchorY === 1) {
                result.adjustedY = Math.round(relativeY + textBounds.height);
            } else {
                result.adjustedY = Math.round(relativeY);
            }
        }
    }

    return result;
}

function extractCommonProps(node: FigmaNode, isRootLevel: boolean = false): Record<string, any> {
    let componentType: string;

    if (node.name && node.name.endsWith('Button')) {
        componentType = 'AnimationButton';
    } else if (isRootLevel) {
        componentType = 'ComponentContainer';
    } else if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET' || node.type === 'INSTANCE') {
        componentType = 'Component';
    } else {
        componentType = NODE_TYPE_MAPPING[node.type] || node.type;
    }

    const props: Record<string, any> = {
        name: node.name,
        type: componentType
    };

    if (node.absoluteBoundingBox) {
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

    if (node.relativeTransform && !isRootLevel) {
        const transform = node.relativeTransform;
        if (transform.length >= 2) {
            props.localX = Math.round(transform[0][2]);
            props.localY = Math.round(transform[1][2]);
        }
    }

    if (node.visible !== undefined && node.visible !== true) {
        props.visible = node.visible;
    }

    if (node.opacity !== undefined && node.opacity !== 1) {
        props.alpha = node.opacity;
    }

    if (node.rotation !== undefined && node.rotation !== 0) {
        props.rotation = node.rotation;
    }

    return props;
}

function extractVariantProps(node: FigmaNode): Record<string, string> {
    const variants: Record<string, string> = {};
    if (node.componentProperties) {
        Object.entries(node.componentProperties).forEach(([key, value]) => {
            variants[key] = value.value;
        });
    }
    return variants;
}

function determineViewportType(variantProps: Record<string, string>, componentName: string): string {
    const supportedViewports = ['default', 'portrait', 'landscape'];

    for (const [key, value] of Object.entries(variantProps)) {
        const lowerKey = key.toLowerCase();
        const lowerValue = value.toLowerCase();

        if (lowerKey.includes('viewport') || lowerKey.includes('orientation') || lowerKey.includes('layout')) {
            if (supportedViewports.includes(lowerValue)) return lowerValue;
        }

        if (supportedViewports.includes(lowerValue)) return lowerValue;
    }

    const lowerName = componentName.toLowerCase();
    for (const viewport of supportedViewports) {
        if (lowerName.includes(viewport)) return viewport;
    }

    return 'default';
}

function extractInstanceVariant(node: FigmaNode): Record<string, any> {
    if (node.type !== 'INSTANCE') return {};

    const props: Record<string, any> = {};

    if (node.componentProperties) {
        const variantProps = extractVariantProps(node);
        const viewport = determineViewportType(variantProps, node.name);
        if (viewport !== 'default') {
            props.variant = viewport;
        }
    }

    if (!props.variant) {
        const lowerName = node.name.toLowerCase();
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

function buildComponentMap(node: FigmaNode, componentMap: Map<string, ComponentInfo> = new Map(), parentIsComponentSet: boolean = false): Map<string, ComponentInfo> {
    if ((node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') && node.id && node.name && !parentIsComponentSet) {
        componentMap.set(node.id, {
            name: node.name,
            width: node.absoluteBoundingBox ? node.absoluteBoundingBox.width : 0,
            height: node.absoluteBoundingBox ? node.absoluteBoundingBox.height : 0
        });
    }

    if (node.type === 'COMPONENT_SET' && node.children) {
        node.children.forEach(variant => {
            if (variant.type === 'COMPONENT' && variant.id) {
                componentMap.set(variant.id, {
                    name: node.name,
                    width: variant.absoluteBoundingBox ? variant.absoluteBoundingBox.width : 0,
                    height: variant.absoluteBoundingBox ? variant.absoluteBoundingBox.height : 0
                });
            }
        });
    }

    if (node.children) {
        const isComponentSet = node.type === 'COMPONENT_SET';
        node.children.forEach(child => buildComponentMap(child, componentMap, isComponentSet));
    }

    return componentMap;
}

function processNode(node: FigmaNode, parentBounds: BoundingBox | null = null, isRootLevel: boolean = false, componentMap: Map<string, ComponentInfo> = new Map()): Record<string, any> {
    if (node.type === 'INSTANCE') {
        let parentComponentInfo: ComponentInfo = { name: 'Component', width: 0, height: 0 };
        if (node.componentId && componentMap.has(node.componentId)) {
            parentComponentInfo = componentMap.get(node.componentId)!;
        }

        const props: Record<string, any> = {
            name: node.name,
            type: parentComponentInfo.name,
            isInstance: true
        };

        if (parentBounds && node.absoluteBoundingBox) {
            props.x = Math.round(node.absoluteBoundingBox.x - parentBounds.x);
            props.y = Math.round(node.absoluteBoundingBox.y - parentBounds.y);
        }

        if (node.absoluteBoundingBox && parentComponentInfo.width > 0 && parentComponentInfo.height > 0) {
            const scaleX = node.absoluteBoundingBox.width / parentComponentInfo.width;
            const scaleY = node.absoluteBoundingBox.height / parentComponentInfo.height;

            if (Math.abs(scaleX - 1) > 0.001 || Math.abs(scaleY - 1) > 0.001) {
                if (Math.abs(scaleX - scaleY) < 0.001) {
                    props.scale = Math.round(scaleX * 1000) / 1000;
                } else {
                    props.scale = {
                        x: Math.round(scaleX * 1000) / 1000,
                        y: Math.round(scaleY * 1000) / 1000
                    };
                }
            }
        }

        Object.assign(props, extractInstanceVariant(node));
        return props;
    }

    if (node.name && node.name.endsWith('_ph')) {
        const props: Record<string, any> = {
            name: node.name,
            type: 'SuperContainer'
        };

        if (node.absoluteBoundingBox) {
            const centerX = node.absoluteBoundingBox.x + node.absoluteBoundingBox.width / 2;
            const centerY = node.absoluteBoundingBox.y + node.absoluteBoundingBox.height / 2;

            if (parentBounds) {
                props.x = Math.round(centerX - parentBounds.x);
                props.y = Math.round(centerY - parentBounds.y);
            } else {
                props.x = Math.round(centerX);
                props.y = Math.round(centerY);
            }
        }

        return props;
    }

    const props = extractCommonProps(node, isRootLevel);

    if (parentBounds && node.absoluteBoundingBox) {
        props.x = Math.round(node.absoluteBoundingBox.x - parentBounds.x);
        props.y = Math.round(node.absoluteBoundingBox.y - parentBounds.y);
    }

    switch (node.type) {
        case 'FRAME':
            Object.assign(props, extractAutoLayoutProps(node));
            break;
        case 'TEXT': {
            Object.assign(props, extractTextProps(node));
            const textPositioning = calculateTextPositioning(node, parentBounds);
            if (textPositioning.anchorX !== undefined) props.anchorX = textPositioning.anchorX;
            if (textPositioning.anchorY !== undefined) props.anchorY = textPositioning.anchorY;
            if (textPositioning.adjustedX !== undefined) props.x = textPositioning.adjustedX;
            if (textPositioning.adjustedY !== undefined) props.y = textPositioning.adjustedY;
            break;
        }
        case 'RECTANGLE':
            Object.assign(props, extractFillProps(node));
            Object.assign(props, extractStrokeProps(node));
            Object.assign(props, extractCornerProps(node));
            break;
        case 'ELLIPSE':
        case 'VECTOR':
            Object.assign(props, extractFillProps(node));
            Object.assign(props, extractStrokeProps(node));
            break;
        case 'INSTANCE':
            Object.assign(props, extractInstanceVariant(node));
            break;
    }

    let shouldExportChildren: boolean;

    if (isRootLevel) {
        shouldExportChildren = true;
    } else {
        shouldExportChildren = node.type === 'GROUP' ||
            node.type === 'FRAME' ||
            (node.type !== 'COMPONENT' &&
                node.type !== 'COMPONENT_SET' &&
                node.type !== 'INSTANCE');
    }

    if (node.children && node.children.length > 0 && shouldExportChildren) {
        props.children = node.children
            .filter(child => child.name !== 'screen')
            .map(child => processNode(child, node.absoluteBoundingBox as BoundingBox, false, componentMap));
    }

    return props;
}

function processComponentVariants(componentSet: FigmaNode, componentMap: Map<string, ComponentInfo>): Record<string, any> | null {
    const componentName = componentSet.name;

    if (!componentSet.children || componentSet.children.length === 0) return null;

    const viewportGroups: Record<string, any[]> = {
        default: [],
        portrait: [],
        landscape: []
    };

    componentSet.children.forEach(variant => {
        if (variant.type !== 'COMPONENT') return;

        const variantProps = extractVariantProps(variant);
        const config = processNode(variant, null, true, componentMap);
        const viewport = determineViewportType(variantProps, variant.name);

        viewportGroups[viewport].push({
            ...config,
            variantProps: Object.keys(variantProps).length > 0 ? variantProps : undefined
        });
    });

    const componentType = componentName.endsWith('Button') ? 'AnimationButton' : 'ComponentContainer';
    const result: Record<string, any> = {
        name: componentName,
        type: componentType,
        variants: {}
    };

    Object.entries(viewportGroups).forEach(([viewport, configs]) => {
        if (configs.length > 0) {
            if (configs.length === 1) {
                const { name, type, ...variantConfig } = configs[0];
                result.variants[viewport] = variantConfig;
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

    const hasSpecificViewports = Object.keys(result.variants).length > 0;

    if (!hasSpecificViewports && componentSet.children.length > 0) {
        const firstVariant = componentSet.children.find(child => child.type === 'COMPONENT');
        if (firstVariant) {
            const config = processNode(firstVariant, null, true, componentMap);
            const { name, type, ...variantConfig } = config;
            result.variants.default = variantConfig;
        }
    }

    return result;
}

export async function run(_args: string[]): Promise<void> {
    const gameRoot = findGameRoot();
    const fileKey = process.env.FILE_KEY;

    if (!fileKey) {
        console.error('FILE_KEY is not set in .env');
        process.exit(1);
    }

    const auth = new FigmaAuth();
    const client = new FigmaClient(auth);
    const outputDir = path.join(gameRoot, 'assets');

    console.log('Checking OAuth authorization...');
    await auth.getValidToken();
    console.log('OAuth authorization OK\n');

    console.log('Fetching Figma file...');
    const figmaData = await client.getFile(fileKey);
    const document = figmaData.document;
    const componentsPage = document.children?.find(child => child.name === 'layouts');

    if (!componentsPage) {
        throw new Error('Page "layouts" not found in Figma file');
    }

    console.log('Building component map...');
    const componentMap = buildComponentMap(document);
    console.log(`Found ${componentMap.size} components`);

    const components: Record<string, any>[] = [];

    for (const child of componentsPage.children || []) {
        if (child.name === 'screen') {
            console.log(`Skipping: ${child.name}`);
            continue;
        }

        console.log(`Processing: ${child.name}`);

        let componentConfig: Record<string, any> | null;

        if (child.type === 'COMPONENT_SET') {
            componentConfig = processComponentVariants(child, componentMap);
        } else {
            const nodeConfig = processNode(child, null, true, componentMap);
            const { name, type, ...variantConfig } = nodeConfig;
            const componentType = child.name.endsWith('Button') ? 'AnimationButton' : 'ComponentContainer';
            componentConfig = {
                name: nodeConfig.name,
                type: componentType,
                variants: { default: variantConfig }
            };
        }

        if (componentConfig) {
            components.push(componentConfig);
        }
    }

    const componentsWithMultipleVariants = components.filter(c => {
        if (!c.variants) return false;
        return Object.keys(c.variants).length > 1;
    });

    const stats = {
        totalComponents: components.length,
        componentsWithVariants: componentsWithMultipleVariants.length,
        componentsWithoutVariants: components.length - componentsWithMultipleVariants.length
    };

    const variantStats: Record<string, number> = { default: 0, portrait: 0, landscape: 0 };
    components.forEach(component => {
        if (component.variants) {
            Object.keys(component.variants).forEach(key => {
                if (key in variantStats) variantStats[key]++;
            });
        }
    });

    const config = {
        components,
        metadata: {
            exportedAt: new Date().toISOString(),
            figmaFileKey: fileKey,
            statistics: { ...stats, variantsByViewport: variantStats }
        }
    };

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const jsonPath = path.join(outputDir, 'components.config.json');
    await fs.promises.writeFile(jsonPath, JSON.stringify(config, null, 2));

    console.log(`\nComponents config saved: ${jsonPath}`);
    console.log(`\nExport statistics:`);
    console.log(`  Total components: ${stats.totalComponents}`);
    console.log(`  With variants: ${stats.componentsWithVariants}`);
    console.log(`  Without variants: ${stats.componentsWithoutVariants}`);

    if (stats.componentsWithVariants > 0) {
        console.log(`\nVariants by viewport:`);
        Object.entries(variantStats).forEach(([viewport, count]) => {
            if (count > 0) console.log(`  ${viewport}: ${count}`);
        });
    }

    console.log('\nExport complete!');
}
