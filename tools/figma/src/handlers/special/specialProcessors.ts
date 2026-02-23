import type { AbstractNode } from '../../adapters/types';
import { cleanNameFromSizeMarker, determineViewportType, extractCommonProps, extractVariantProps } from '../../extractors';
import { ProcessingContext } from '../../core/types';
import { getContainerBounds, withContext } from '../../core/ProcessingContext';

/**
 * @callback ProcessNodeFn
 * @param {AbstractNode} node
 * @param {ProcessingContext} context
 * @returns {any}
 */
export type ProcessNodeFn = (node: AbstractNode, context: ProcessingContext) => any;

/**
 * @param {AbstractNode} node
 * @param {ProcessingContext} context
 * @param {ProcessNodeFn} processNode
 * @returns {any}
 */
export function processProgressBar(node: AbstractNode, context: ProcessingContext, processNode: ProcessNodeFn): any {
  const componentName = node.name;

  try {
    const progressConfig: any = {
      name: componentName,
      type: 'ProgressBar'
    };

    const nodeContext = withContext(context, { isRootLevel: true, parentBounds: null, parentZoneInfo: null });
    const nodeProps = extractCommonProps(node, true, null);
    const { type: _, ...commonProps } = nodeProps;
    Object.assign(progressConfig, commonProps);

    if ('children' in node && node.children && node.children.length > 0) {
      let bgChild: any = null;
      let fillChild: any = null;

      node.children.forEach((child: AbstractNode) => {
        const childName = child.name.toLowerCase();
        const childContext = withContext(nodeContext, { isRootLevel: false });

        if (childName === 'bg') {
          const childConfig = processNode(child, childContext);
          delete childConfig.x;
          delete childConfig.y;
          progressConfig.bg = childConfig;
          bgChild = child;
        } else if (childName === 'fill') {
          const childConfig = processNode(child, childContext);
          delete childConfig.x;
          delete childConfig.y;
          progressConfig.fill = childConfig;
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

/**
 * @param {AbstractNode} componentSet
 * @param {ProcessingContext} context
 * @param {ProcessNodeFn} processNode
 * @returns {any}
 */
export function processProgressBarComponentSet(
  componentSet: AbstractNode,
  context: ProcessingContext,
  processNode: ProcessNodeFn
): any {
  const componentName = componentSet.name;
  if (!componentSet.children || componentSet.children.length === 0) return null;

  const firstVariant = componentSet.children.find(child => child.type === 'COMPONENT');
  if (!firstVariant) return null;

  try {
    const variantConfig = processNode(firstVariant, withContext(context, { isRootLevel: true, parentBounds: null, parentZoneInfo: null }));
    const progressConfig: any = { name: componentName, type: 'ProgressBar' };

    if (variantConfig.children) {
      let bgChild: any = null;
      let fillChild: any = null;

      variantConfig.children.forEach((child: any) => {
        const childName = child.name.toLowerCase();
        if (childName === 'bg') {
          const { x, y, ...childWithoutCoords } = child;
          progressConfig.bg = childWithoutCoords;
          bgChild = child;
        } else if (childName === 'fill') {
          const { x, y, ...childWithoutCoords } = child;
          progressConfig.fill = childWithoutCoords;
          fillChild = child;
        }
      });

      if (fillChild && bgChild) {
        progressConfig.fillPaddings = { left: fillChild.x - bgChild.x, top: fillChild.y - bgChild.y };
      } else if (fillChild) {
        progressConfig.fillPaddings = { left: fillChild.x || 0, top: fillChild.y || 0 };
      }
    }

    return progressConfig;
  } catch (error) {
    console.warn(`Error processing ProgressBar component ${componentName}:`, error);
    return null;
  }
}

/**
 * @param {AbstractNode} node
 * @param {ProcessingContext} context
 * @param {ProcessNodeFn} processNode
 * @returns {any}
 */
export function processDotsGroup(node: AbstractNode, context: ProcessingContext, processNode: ProcessNodeFn): any {
  const componentName = node.name;
  if (!('children' in node) || !node.children || node.children.length === 0) return null;

  try {
    const dotsConfig: any = {
      name: componentName,
      type: 'DotsGroup',
      gap: 0,
      flow: 'horizontal'
    };

    if ('layoutMode' in node && node.layoutMode && node.layoutMode !== 'NONE') {
      dotsConfig.flow = node.layoutMode.toLowerCase();
      if ('itemSpacing' in node && node.itemSpacing !== undefined) {
        dotsConfig.gap = node.itemSpacing;
      }
      if (node.layoutMode === 'GRID' && 'counterAxisSpacing' in node && node.counterAxisSpacing !== undefined) {
        dotsConfig.gap = node.itemSpacing || 0;
      }
    }

    node.children.forEach((child: AbstractNode) => {
      const childName = child.name.toLowerCase();
      const childConfig = processNode(child, withContext(context, { isRootLevel: false, parentBounds: null, parentZoneInfo: null }));
      if (childName === 'on') {
        delete childConfig.x;
        delete childConfig.y;
        dotsConfig.on = childConfig;
      } else if (childName === 'off') {
        delete childConfig.x;
        delete childConfig.y;
        dotsConfig.off = childConfig;
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

/**
 * @param {AbstractNode} node
 * @param {ProcessingContext} context
 * @param {ProcessNodeFn} processNode
 * @returns {any}
 */
export function processRadioGroup(node: AbstractNode, context: ProcessingContext, processNode: ProcessNodeFn): any {
  const componentName = node.name;
  if (!('children' in node) || !node.children || node.children.length === 0) return null;

  try {
    const radioGroupConfig: any = {
      name: componentName,
      type: 'RadioGroup',
      elementsMargin: 0,
      flow: 'horizontal'
    };

    if ('layoutMode' in node && node.layoutMode && node.layoutMode !== 'NONE') {
      radioGroupConfig.flow = node.layoutMode.toLowerCase();
      if ('itemSpacing' in node && node.itemSpacing !== undefined) {
        radioGroupConfig.elementsMargin = Math.round(node.itemSpacing);
      }
      if (node.layoutMode === 'GRID' && 'counterAxisSpacing' in node && node.counterAxisSpacing !== undefined) {
        radioGroupConfig.elementsMargin = Math.round(node.itemSpacing || 0);
      }
    }

    let onChild: AbstractNode | null = null;
    let offChild: AbstractNode | null = null;
    let totalChildCount = 0;

    node.children.forEach((child: AbstractNode) => {
      const childName = child.name.toLowerCase();
      totalChildCount++;

      if (childName === 'on' && !onChild) {
        const childConfig = processNode(child, withContext(context, { isRootLevel: false, parentBounds: null, parentZoneInfo: null }));
        delete childConfig.x;
        delete childConfig.y;
        if ('width' in child && 'height' in child) {
          childConfig.width = Math.round(child.width);
          childConfig.height = Math.round(child.height);
        }
        radioGroupConfig.on = childConfig;
        onChild = child;
      } else if (childName === 'off' && !offChild) {
        const childConfig = processNode(child, withContext(context, { isRootLevel: false, parentBounds: null, parentZoneInfo: null }));
        delete childConfig.x;
        delete childConfig.y;
        if ('width' in child && 'height' in child) {
          childConfig.width = Math.round(child.width);
          childConfig.height = Math.round(child.height);
        }
        radioGroupConfig.off = childConfig;
        offChild = child;
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

/**
 * @param {AbstractNode} node
 * @param {ProcessingContext} context
 * @param {ProcessNodeFn} processNode
 * @returns {any}
 */
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

/**
 * @param {AbstractNode} componentSet
 * @param {ProcessingContext} context
 * @param {ProcessNodeFn} processNode
 * @returns {any}
 */
export function processValueSliderComponentSet(
  componentSet: AbstractNode,
  context: ProcessingContext,
  processNode: ProcessNodeFn
): any {
  const componentName = componentSet.name;
  if (!componentSet.children || componentSet.children.length === 0) return null;
  const firstVariant = componentSet.children.find(child => child.type === 'COMPONENT');
  if (!firstVariant) return null;

  try {
    const variantConfig = processNode(firstVariant, withContext(context, { isRootLevel: true, parentBounds: null, parentZoneInfo: null }));
    const valueSliderConfig: any = { name: componentName, type: 'ValueSlider' };
    if (variantConfig.children) {
      valueSliderConfig.children = variantConfig.children;
    }
    return valueSliderConfig;
  } catch (error) {
    console.warn(`Error processing ValueSlider component ${componentName}:`, error);
    return null;
  }
}

/**
 * @param {AbstractNode} node
 * @param {ProcessingContext} context
 * @param {ProcessNodeFn} processNode
 * @returns {any}
 */
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
export function processVariantsContainerSet(
  componentSet: AbstractNode,
  context: ProcessingContext,
  processNode: ProcessNodeFn
): any {
  const componentName = componentSet.name;
  if (!componentSet.children || componentSet.children.length === 0) return null;

  const variants: { [key: string]: any } = {};
  componentSet.children.forEach(variant => {
    if (variant.type !== 'COMPONENT') return;
    try {
      const variantProps = extractVariantProps(variant);
      const config = processNode(variant, withContext(context, { isRootLevel: true, parentBounds: null, parentZoneInfo: null }));
      let variantName = 'default';

      if (variantProps.variant) {
        variantName = variantProps.variant;
      } else if (Object.keys(variantProps).length > 0) {
        const firstKey = Object.keys(variantProps)[0];
        variantName = variantProps[firstKey];
      } else if (variant.name.includes('=')) {
        const pairs = variant.name.split(',').map((s: string) => s.trim());
        const firstPair = pairs[0];
        if (firstPair.includes('=')) {
          variantName = firstPair.split('=')[1].trim();
        }
      } else {
        variantName = variant.name;
      }

      const { name, type, ...variantConfig } = config;
      variants[variantName] = variantConfig;
    } catch (error) {
      console.warn(`Error processing VariantsContainer variant ${variant.name}:`, error);
    }
  });

  return {
    name: componentName,
    type: 'VariantsContainer',
    variants
  };
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

  const result: any = { name: componentName, type: 'CheckBoxComponent', states: {} };
  if (onState) {
    if (onState.children && onState.children.length > 0) {
      result.states.on = onState.children[0];
    } else {
      const stateCopy = Object.assign({}, onState);
      delete stateCopy.name;
      delete stateCopy.type;
      result.states.on = stateCopy;
    }
  }
  if (offState) {
    if (offState.children && offState.children.length > 0) {
      result.states.off = offState.children[0];
    } else {
      const stateCopy = Object.assign({}, offState);
      delete stateCopy.name;
      delete stateCopy.type;
      result.states.off = stateCopy;
    }
  }

  return result;
}

/**
 * @param {AbstractNode} componentSet
 * @param {ProcessingContext} context
 * @param {ProcessNodeFn} processNode
 * @returns {any}
 */
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

  const componentType = cleanNameFromSizeMarker(componentName).endsWith('Button') ? 'Button' : 'ComponentContainer';
  const result: any = { name: componentName, type: componentType, variants: {} };

  Object.entries(viewportGroups).forEach(([viewport, configs]) => {
    if (configs.length > 0) {
      if (configs.length === 1) {
        const config = configs[0];
        const { name, type, ...variantConfig } = config;
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
      const config = processNode(firstVariant, withContext(context, { isRootLevel: true, parentBounds: null, parentZoneInfo: null }));
      const { name, type, ...variantConfig } = config;
      result.variants.default = variantConfig;
    }
  }

  return result;
}

/**
 * @param {AbstractNode} node
 * @param {ProcessingContext} context
 * @param {ProcessNodeFn} processNode
 * @returns {any}
 */
export function processReelsLayout(node: AbstractNode, context: ProcessingContext, processNode: ProcessNodeFn): any {
  const componentName = node.name;
  if (!('children' in node) || !node.children || node.children.length === 0) return null;

  try {
    const reelsConfig: any = { name: componentName, type: 'ReelsLayout' };

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
