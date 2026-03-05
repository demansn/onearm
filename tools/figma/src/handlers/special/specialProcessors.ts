import type { AbstractNode } from '../../adapters/types';
import { cleanNameFromSizeMarker, determineViewportType, extractCommonProps, extractTextProps, extractVariantProps } from '../../extractors';
import { findComponentType } from '../../core/componentRegistry';
import { ProcessingContext } from '../../core/types';
import { getContainerBounds, withContext } from '../../core/ProcessingContext';

export type ProcessNodeFn = (node: AbstractNode, context: ProcessingContext) => any;

// --- Helpers ---

function stripCoords(config: any): any {
  const { x, y, ...rest } = config;
  return rest;
}

function extractLayoutSpacing(node: AbstractNode): { flow: string; spacing: number } {
  if ('layoutMode' in node && node.layoutMode && node.layoutMode !== 'NONE') {
    let spacing = 0;
    if ('itemSpacing' in node && node.itemSpacing !== undefined) {
      spacing = node.itemSpacing;
    }
    if (node.layoutMode === 'GRID' && 'counterAxisSpacing' in node && node.counterAxisSpacing !== undefined) {
      spacing = node.itemSpacing || 0;
    }
    return { flow: node.layoutMode.toLowerCase(), spacing };
  }
  return { flow: 'horizontal', spacing: 0 };
}

function processFirstVariantOfSet(
  componentSet: AbstractNode,
  context: ProcessingContext,
  processNode: ProcessNodeFn,
  typeName: string,
  buildConfig: (variantConfig: any) => any
): any {
  if (!componentSet.children || componentSet.children.length === 0) return null;
  const firstVariant = componentSet.children.find(child => child.type === 'COMPONENT');
  if (!firstVariant) return null;

  try {
    const variantConfig = processNode(firstVariant, withContext(context, { isRootLevel: true, parentBounds: null, parentZoneInfo: null }));
    return { name: componentSet.name, type: typeName, ...buildConfig(variantConfig) };
  } catch (error) {
    console.warn(`Error processing ${typeName} component ${componentSet.name}:`, error);
    return null;
  }
}

// --- Processors ---

export function processProgressBar(node: AbstractNode, context: ProcessingContext, processNode: ProcessNodeFn): any {
  const componentName = node.name;

  try {
    const progressConfig: any = {
      name: componentName,
      type: 'ProgressBar'
    };

    const nodeContext = withContext(context, { isRootLevel: true, parentBounds: null, parentZoneInfo: null });
    const { type: _, ...commonProps } = extractCommonProps(node, true, null);
    Object.assign(progressConfig, commonProps);

    if ('children' in node && node.children && node.children.length > 0) {
      let bgChild: any = null;
      let fillChild: any = null;

      node.children.forEach((child: AbstractNode) => {
        const childName = child.name.toLowerCase();
        const childContext = withContext(nodeContext, { isRootLevel: false });

        if (childName === 'bg') {
          progressConfig.bg = stripCoords(processNode(child, childContext));
          bgChild = child;
        } else if (childName === 'fill') {
          progressConfig.fill = stripCoords(processNode(child, childContext));
          fillChild = child;
        }
      });

      if (!progressConfig.bg) {
        console.warn(`ProgressBar "${componentName}": missing required child "bg"`);
      }
      if (!progressConfig.fill) {
        console.warn(`ProgressBar "${componentName}": missing required child "fill"`);
      }

      if (fillChild && bgChild) {
        progressConfig.fillPaddings = {
          left: Math.round(fillChild.x - bgChild.x),
          top: Math.round(fillChild.y - bgChild.y)
        };
      } else if (fillChild) {
        progressConfig.fillPaddings = {
          left: Math.round(fillChild.x),
          top: Math.round(fillChild.y)
        };
      }
    } else {
      const nodeConfig = processNode(node, withContext(nodeContext, { isRootLevel: false }));
      delete nodeConfig.x;
      delete nodeConfig.y;
      delete nodeConfig.name;
      delete nodeConfig.type;
      Object.assign(progressConfig, nodeConfig);
    }

    return progressConfig;
  } catch (error) {
    console.warn(`Error processing ProgressBar component ${componentName}:`, error);
    return null;
  }
}

export function processProgressBarComponentSet(
  componentSet: AbstractNode,
  context: ProcessingContext,
  processNode: ProcessNodeFn
): any {
  return processFirstVariantOfSet(componentSet, context, processNode, 'ProgressBar', (variantConfig) => {
    const result: any = {};
    if (!variantConfig.children) return result;

    let bgChild: any = null;
    let fillChild: any = null;

    variantConfig.children.forEach((child: any) => {
      const childName = child.name.toLowerCase();
      if (childName === 'bg') {
        result.bg = stripCoords(child);
        bgChild = child;
      } else if (childName === 'fill') {
        result.fill = stripCoords(child);
        fillChild = child;
      }
    });

    if (fillChild && bgChild) {
      result.fillPaddings = { left: fillChild.x - bgChild.x, top: fillChild.y - bgChild.y };
    } else if (fillChild) {
      result.fillPaddings = { left: fillChild.x || 0, top: fillChild.y || 0 };
    }

    return result;
  });
}

export function processDotsGroup(node: AbstractNode, context: ProcessingContext, processNode: ProcessNodeFn): any {
  const componentName = node.name;
  if (!('children' in node) || !node.children || node.children.length === 0) return null;

  try {
    const { flow, spacing } = extractLayoutSpacing(node);
    const dotsConfig: any = {
      name: componentName,
      type: 'DotsGroup',
      gap: spacing,
      flow
    };

    node.children.forEach((child: AbstractNode) => {
      const childName = child.name.toLowerCase();
      if (childName === 'on' || childName === 'off') {
        dotsConfig[childName] = stripCoords(
          processNode(child, withContext(context, { isRootLevel: false, parentBounds: null, parentZoneInfo: null }))
        );
      }
    });

    if (!dotsConfig.on) {
      console.warn(`DotsGroup "${componentName}": missing required child "on"`);
    }
    if (!dotsConfig.off) {
      console.warn(`DotsGroup "${componentName}": missing required child "off"`);
    }

    return dotsConfig;
  } catch (error) {
    console.warn(`Error processing DotsGroup component ${componentName}:`, error);
    return null;
  }
}

export function processRadioGroup(node: AbstractNode, context: ProcessingContext, processNode: ProcessNodeFn): any {
  const componentName = node.name;
  if (!('children' in node) || !node.children || node.children.length === 0) return null;

  try {
    const { flow, spacing } = extractLayoutSpacing(node);
    const radioGroupConfig: any = {
      name: componentName,
      type: 'RadioGroup',
      elementsMargin: Math.round(spacing),
      flow
    };

    let onChild: AbstractNode | null = null;
    let offChild: AbstractNode | null = null;
    let totalChildCount = 0;

    node.children.forEach((child: AbstractNode) => {
      const childName = child.name.toLowerCase();
      totalChildCount++;

      if ((childName === 'on' && !onChild) || (childName === 'off' && !offChild)) {
        const childConfig = stripCoords(
          processNode(child, withContext(context, { isRootLevel: false, parentBounds: null, parentZoneInfo: null }))
        );
        if ('width' in child && 'height' in child) {
          childConfig.width = Math.round(child.width);
          childConfig.height = Math.round(child.height);
        }
        radioGroupConfig[childName] = childConfig;
        if (childName === 'on') onChild = child;
        else offChild = child;
      }
    });

    if (!radioGroupConfig.on) {
      console.warn(`RadioGroup "${componentName}": missing required child "on"`);
    }
    if (!radioGroupConfig.off) {
      console.warn(`RadioGroup "${componentName}": missing required child "off"`);
    }

    if (totalChildCount > 0) {
      radioGroupConfig.size = totalChildCount;
    } else {
      const sizeMatch = componentName.match(/\d+/);
      radioGroupConfig.size = sizeMatch ? parseInt(sizeMatch[0], 10) : 3;
    }

    return radioGroupConfig;
  } catch (error) {
    console.warn(`Error processing RadioGroup component ${componentName}:`, error);
    return null;
  }
}

export function processValueSlider(node: AbstractNode, context: ProcessingContext, processNode: ProcessNodeFn): any {
  const componentName = node.name;
  if (!('children' in node) || !node.children || node.children.length === 0) return null;

  try {
    const valueSliderConfig: any = { name: componentName, type: 'ValueSlider' };
    const parentBounds = getContainerBounds(node);
    valueSliderConfig.children = node.children.map((child: AbstractNode) =>
      processNode(child, withContext(context, { parentBounds, isRootLevel: false, parentZoneInfo: null }))
    );
    return valueSliderConfig;
  } catch (error) {
    console.warn(`Error processing ValueSlider component ${componentName}:`, error);
    return null;
  }
}

export function processValueSliderComponentSet(
  componentSet: AbstractNode,
  context: ProcessingContext,
  processNode: ProcessNodeFn
): any {
  return processFirstVariantOfSet(componentSet, context, processNode, 'ValueSlider', (variantConfig) => {
    return variantConfig.children ? { children: variantConfig.children } : {};
  });
}

export function processScrollBox(node: AbstractNode, context: ProcessingContext, processNode: ProcessNodeFn): any {
  const componentName = node.name;
  try {
    const scrollBoxConfig: any = {
      name: cleanNameFromSizeMarker(componentName),
      type: 'ScrollBox',
      width: Math.round(node.width),
      height: Math.round(node.height),
      scrollType: 'vertical',
      elementsMargin: 0
    };

    if ('layoutMode' in node && node.layoutMode && node.layoutMode !== 'NONE') {
      scrollBoxConfig.scrollType = node.layoutMode === 'HORIZONTAL' ? 'horizontal' : 'vertical';
      if ('itemSpacing' in node && node.itemSpacing !== undefined) {
        scrollBoxConfig.elementsMargin = Math.round(node.itemSpacing);
      }
    }

    if ('children' in node && node.children && node.children.length > 0) {
      const parentBounds = getContainerBounds(node);
      scrollBoxConfig.children = node.children.map((child: AbstractNode) =>
        processNode(child, withContext(context, { parentBounds, isRootLevel: false, parentZoneInfo: null }))
      );
    }

    return scrollBoxConfig;
  } catch (error) {
    console.warn(`Error processing ScrollBox component ${componentName}:`, error);
    return null;
  }
}

/**
 * @param {AbstractNode} componentSet
 * @param {ProcessingContext} context
 * @param {ProcessNodeFn} processNode
 * @returns {any}
 */
export function processToggleComponentSet(
  componentSet: AbstractNode,
  context: ProcessingContext,
  processNode: ProcessNodeFn
): any {
  const componentName = componentSet.name;
  if (!componentSet.children || componentSet.children.length === 0) return null;

  let onState: any = null;
  let offState: any = null;

  componentSet.children.forEach(variant => {
    if (variant.type !== 'COMPONENT') return;
    try {
      const variantProps = extractVariantProps(variant);
      if (variantProps.state === 'on' || variant.name.includes('state=on')) {
        onState = processNode(variant, withContext(context, { isRootLevel: true, parentBounds: null, parentZoneInfo: null }));
      } else if (variantProps.state === 'off' || variant.name.includes('state=off')) {
        offState = processNode(variant, withContext(context, { isRootLevel: true, parentBounds: null, parentZoneInfo: null }));
      }
    } catch (error) {
      console.warn(`Error processing toggle variant ${variant.name}:`, error);
    }
  });

  const result: any = { name: componentName, type: 'CheckBoxComponent' };
  if (onState) {
    if (onState.children && onState.children.length > 0) {
      result.checked = onState.children[0];
    } else {
      const stateCopy = Object.assign({}, onState);
      delete stateCopy.name;
      delete stateCopy.type;
      result.checked = stateCopy;
    }
  }
  if (offState) {
    if (offState.children && offState.children.length > 0) {
      result.unchecked = offState.children[0];
    } else {
      const stateCopy = Object.assign({}, offState);
      delete stateCopy.name;
      delete stateCopy.type;
      result.unchecked = stateCopy;
    }
  }

  return result;
}

export function flattenButtonChildren(variantConfig: any): void {
  if (!variantConfig.children || variantConfig.children.length === 0) return;

  let imageChild: any = null;
  let textChild: any = null;

  for (const child of variantConfig.children) {
    if (child.type === 'Text' && !textChild) {
      textChild = child;
    } else if (!imageChild) {
      imageChild = child;
    }
  }

  if (imageChild) {
    variantConfig.image = imageChild;
  }
  if (textChild) {
    variantConfig.text = textChild.text;
    if (textChild.style) {
      variantConfig.textStyle = textChild.style;
    }
  }

  delete variantConfig.children;
}

export function processComponentVariantsSet(
  componentSet: AbstractNode,
  context: ProcessingContext,
  processNode: ProcessNodeFn
): any {
  const componentName = componentSet.name;
  if (!componentSet.children || componentSet.children.length === 0) return null;

  const viewportGroups: { [key: string]: any[] } = {
    default: [],
    portrait: [],
    landscape: []
  };

  componentSet.children.forEach(variant => {
    if (variant.type !== 'COMPONENT') return;

    try {
      const variantProps = extractVariantProps(variant);
      const config = processNode(variant, withContext(context, { isRootLevel: true, parentBounds: null, parentZoneInfo: null }));
      const viewport = determineViewportType(variantProps, variant.name);
      viewportGroups[viewport].push({
        ...config,
        variantProps: Object.keys(variantProps).length > 0 ? variantProps : undefined
      });
    } catch (error) {
      console.warn(`Error processing variant ${variant.name}:`, error);
      const config = processNode(variant, withContext(context, { isRootLevel: true, parentBounds: null, parentZoneInfo: null }));
      const viewport = determineViewportType({}, variant.name);
      viewportGroups[viewport].push(config);
    }
  });

  const cleanName = cleanNameFromSizeMarker(componentName);
  const typeDef = findComponentType(cleanName);

  // Determine root type
  let rootType: string;
  if (typeDef?.type) {
    rootType = typeDef.type;
  } else {
    const firstVariant = componentSet.children.find(child => child.type === 'COMPONENT');
    if (firstVariant && 'layoutMode' in firstVariant && firstVariant.layoutMode && firstVariant.layoutMode !== 'NONE') {
      rootType = 'AutoLayout';
    } else {
      rootType = 'SuperContainer';
    }
  }

  // Build variants object
  const variants: any = {};
  Object.entries(viewportGroups).forEach(([viewport, configs]) => {
    if (configs.length > 0) {
      if (configs.length === 1) {
        const config = configs[0];
        const { name, type, variantProps, ...variantConfig } = config;
        typeDef?.postProcess?.(variantConfig);
        variants[viewport] = variantConfig;
      } else {
        // Multiple configs in same viewport — try to use component variant values as named keys
        const variantKeys = configs.map(config => {
          if (config.variantProps && Object.keys(config.variantProps).length > 0) {
            const values = Object.values(config.variantProps);
            if (values.length === 1) return String(values[0]);
            return Object.entries(config.variantProps)
              .map(([k, v]) => `${k}=${v}`)
              .join(',');
          }
          return null;
        });

        const allHaveKeys = variantKeys.every((k): k is string => k !== null);
        const allUnique = allHaveKeys && new Set(variantKeys).size === variantKeys.length;

        if (allHaveKeys && allUnique) {
          // Use component variant values as top-level variant keys
          configs.forEach((config, i) => {
            const { name, type, variantProps, ...variantConfig } = config;
            typeDef?.postProcess?.(variantConfig);
            variants[variantKeys[i]] = variantConfig;
          });
        } else {
          // Fallback: array (can't reliably distinguish variants)
          variants[viewport] = configs.map(config => {
            const { name, type, variantProps, ...variantConfig } = config;
            typeDef?.postProcess?.(variantConfig);
            return variantConfig;
          });
        }
      }
    }
  });

  // Fallback: if no viewports matched, use first variant as default
  if (Object.keys(variants).length === 0 && componentSet.children.length > 0) {
    const firstVariant = componentSet.children.find(child => child.type === 'COMPONENT');
    if (firstVariant) {
      const config = processNode(firstVariant, withContext(context, { isRootLevel: true, parentBounds: null, parentZoneInfo: null }));
      const { name, type, ...variantConfig } = config;
      typeDef?.postProcess?.(variantConfig);
      variants.default = variantConfig;
    }
  }

  // Decide output format:
  // - ScreenLayout -> always variants wrapper (viewport switching in runtime)
  // - >1 active viewport -> variants wrapper with rootType
  // - 1 active viewport -> flat output (no variants wrapper)
  const activeViewportCount = Object.keys(variants).length;

  if (rootType === 'ScreenLayout') {
    return { name: componentName, type: 'ScreenLayout', variants };
  }

  if (activeViewportCount > 1) {
    return { name: componentName, type: rootType, variants };
  }

  // Single variant -> flat output
  const singleKey = Object.keys(variants)[0];
  const variantConfig = variants[singleKey];
  if (Array.isArray(variantConfig)) {
    // Multiple configs in single viewport — keep as variants
    return { name: componentName, type: rootType, variants };
  }

  return { name: componentName, type: rootType, ...variantConfig };
}

export function processDOMText(node: AbstractNode, context: ProcessingContext, processNode: ProcessNodeFn): any {
  const componentName = node.name;

  try {
    // Find the TEXT node: either the node itself or first TEXT child (COMPONENT wrapper)
    let textNode: AbstractNode | null = null;
    if (node.type === 'TEXT') {
      textNode = node;
    } else if ('children' in node && node.children && node.children.length > 0) {
      textNode = node.children.find((child: AbstractNode) => child.type === 'TEXT') || null;
    }

    if (!textNode) {
      console.warn(`DOMText "${componentName}": no TEXT node found`);
      return null;
    }

    const { type: _, ...commonProps } = extractCommonProps(node, false, null);
    const textProps = extractTextProps(textNode);

    const domTextConfig: any = {
      name: componentName,
      type: 'DOMText',
      ...commonProps,
      width: Math.round(node.width),
      height: Math.round(node.height),
      ...textProps,
    };

    return domTextConfig;
  } catch (error) {
    console.warn(`Error processing DOMText component ${componentName}:`, error);
    return null;
  }
}

export function processScrollBar(node: AbstractNode, context: ProcessingContext, processNode: ProcessNodeFn): any {
  const componentName = node.name;
  if (!('children' in node) || !node.children || node.children.length === 0) return null;

  try {
    const config: any = { name: componentName, type: 'ScrollBar' };
    const parentBounds = getContainerBounds(node);
    config.children = node.children.map((child: AbstractNode) =>
      processNode(child, withContext(context, { parentBounds, isRootLevel: false, parentZoneInfo: null }))
    );
    return config;
  } catch (error) {
    console.warn(`Error processing ScrollBar component ${componentName}:`, error);
    return null;
  }
}

export function processReelsLayout(node: AbstractNode, context: ProcessingContext, processNode: ProcessNodeFn): any {
  const componentName = node.name;
  if (!('children' in node) || !node.children || node.children.length === 0) return null;

  try {
    const reelsConfig: any = { name: componentName, type: 'ReelsLayoutConfig' };

    node.children.forEach((child: AbstractNode) => {
      const childName = child.name.toLowerCase();
      const childContext = withContext(context, { isRootLevel: false, parentBounds: null, parentZoneInfo: null });

      if (childName === 'shadow') {
        reelsConfig.shadow = processNode(child, childContext);
      } else if (childName === 'mask') {
        reelsConfig.mask = processNode(child, childContext);
      } else if (childName === 'frame') {
        reelsConfig.frame = processNode(child, childContext);
      } else if (childName === 'reels' && child.type === 'FRAME') {
        const reelsData: any = {
          x: Math.round(child.x),
          y: Math.round(child.y),
          gap: { betweenColumns: 0, betweenRows: 0 }
        };

        let hasGridProperties = false;
        if ('layoutMode' in child && child.layoutMode !== 'NONE') {
          hasGridProperties = true;

          if (child.layoutMode === 'GRID') {
            if ('itemSpacing' in child && child.itemSpacing !== undefined) {
              reelsData.gap.betweenColumns = child.itemSpacing;
              reelsData.gap.betweenRows = child.itemSpacing;
            }
            if ('counterAxisSpacing' in child && child.counterAxisSpacing !== undefined) {
              reelsData.gap.betweenRows = child.counterAxisSpacing;
            }
          } else {
            if ('itemSpacing' in child && child.itemSpacing !== undefined) {
              if (child.layoutMode === 'HORIZONTAL') {
                reelsData.gap.betweenColumns = child.itemSpacing;
              } else if (child.layoutMode === 'VERTICAL') {
                reelsData.gap.betweenRows = child.itemSpacing;
              }
            }

            if ('counterAxisSpacing' in child && child.counterAxisSpacing !== undefined) {
              if (child.layoutMode === 'HORIZONTAL') {
                reelsData.gap.betweenRows = child.counterAxisSpacing;
              } else if (child.layoutMode === 'VERTICAL') {
                reelsData.gap.betweenColumns = child.counterAxisSpacing;
              }
            }
          }
        }

        if (!hasGridProperties && 'layoutGrids' in child && child.layoutGrids && child.layoutGrids.length > 0) {
          const grid = child.layoutGrids.find((g: any) => g.pattern === 'GRID');
          if (grid && (grid as any).gutterSize !== undefined) {
            hasGridProperties = true;
            reelsData.gap.betweenColumns = (grid as any).gutterSize;
            reelsData.gap.betweenRows = (grid as any).gutterSize;
          }
        }

        if ((!hasGridProperties || (child.layoutMode === 'GRID' && reelsData.gap.betweenColumns === 0 && reelsData.gap.betweenRows === 0)) && child.children && child.children.length > 0) {
          const children = Array.from(child.children);
          const childPositions = children.map(c => ({ x: c.x, y: c.y, width: c.width, height: c.height }));
          const uniqueXPositions = [...new Set(childPositions.map(p => Math.round(p.x)))].sort((a, b) => a - b);
          const uniqueYPositions = [...new Set(childPositions.map(p => Math.round(p.y)))].sort((a, b) => a - b);

          reelsData.columns = uniqueXPositions.length;
          reelsData.rows = uniqueYPositions.length;

          if (uniqueXPositions.length > 1) {
            const firstY = uniqueYPositions[0];
            const firstChild = childPositions.find(p => Math.round(p.y) === firstY && Math.round(p.x) === uniqueXPositions[0]);
            const secondChild = childPositions.find(p => Math.round(p.y) === firstY && Math.round(p.x) === uniqueXPositions[1]);
            if (firstChild && secondChild) {
              reelsData.gap.betweenColumns = Math.round(secondChild.x - (firstChild.x + firstChild.width));
            }
          }

          if (uniqueYPositions.length > 1) {
            const firstX = uniqueXPositions[0];
            const firstChild = childPositions.find(p => Math.round(p.x) === firstX && Math.round(p.y) === uniqueYPositions[0]);
            const secondChild = childPositions.find(p => Math.round(p.x) === firstX && Math.round(p.y) === uniqueYPositions[1]);
            if (firstChild && secondChild) {
              reelsData.gap.betweenRows = Math.round(secondChild.y - (firstChild.y + firstChild.height));
            }
          }
        } else if (child.children && child.children.length > 0) {
          const children = Array.from(child.children);
          const childPositions = children.map(c => ({ x: c.x, y: c.y, width: c.width, height: c.height }));
          const uniqueXPositions = [...new Set(childPositions.map(p => Math.round(p.x)))].sort((a, b) => a - b);
          const uniqueYPositions = [...new Set(childPositions.map(p => Math.round(p.y)))].sort((a, b) => a - b);
          reelsData.columns = uniqueXPositions.length;
          reelsData.rows = uniqueYPositions.length;
        }

        if (child.children && child.children.length > 0) {
          const firstChild = child.children[0];
          reelsData.symbolWidth = Math.round(firstChild.width);
          reelsData.symbolHeight = Math.round(firstChild.height);
        } else {
          reelsData.symbolWidth = 0;
          reelsData.symbolHeight = 0;
        }

        if (!reelsData.rows) reelsData.rows = 1;
        if (!reelsData.columns) reelsData.columns = 1;
        reelsConfig.reels = reelsData;
      }
    });

    return reelsConfig;
  } catch (error) {
    console.warn(`Error processing ReelsLayout component ${componentName}:`, error);
    return null;
  }
}
