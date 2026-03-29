import type { AbstractNode, ComponentMapEntry } from '../../adapters/types';
import { cleanNameFromSizeMarker, extractCommonProps, extractInstanceVariant, extractTextProps, extractVariantProps } from '../../extractors';
import { findComponentType } from '../../core/componentRegistry';
import { ProcessingContext } from '../../core/types';
import { getContainerBounds, withContext } from '../../core/ProcessingContext';
import { applyRelativePosition, computeScale, getUnrotatedDimensions } from '../../core/coordinateUtils';

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

// --- Placeholder ---

export function processPlaceholder(node: AbstractNode, context: ProcessingContext, processNode: ProcessNodeFn): any {
  if (node.type === 'INSTANCE') {
    let phInfo: ComponentMapEntry = { name: 'Component', width: 0, height: 0, node: undefined };
    if (node.mainComponentId && context.componentMap.has(node.mainComponentId)) {
      phInfo = context.componentMap.get(node.mainComponentId)!;
    }

    const props: any = {
      name: cleanNameFromSizeMarker(node.name),
      type: 'BaseContainer',
    };

    const { origW, origH } = getUnrotatedDimensions(node);
    props.width = Math.round(origW);
    props.height = Math.round(origH);

    const scale = computeScale(props.width, props.height, phInfo.width, phInfo.height);
    if (scale !== undefined) props.scale = scale;

    return props;
  }

  // Non-instance placeholder → SuperContainer with center position
  // Position is set here (center-based), applyRelativePosition in dispatcher will overwrite.
  // We use _positionSet flag to signal dispatcher to skip applyRelativePosition.
  const props: any = {
    name: cleanNameFromSizeMarker(node.name),
    type: 'SuperContainer',
    _skipPosition: true,
  };
  const centerX = node.x + node.width / 2;
  const centerY = node.y + node.height / 2;

  if (context.parentBounds) {
    props.x = Math.round(centerX - context.parentBounds.x);
    props.y = Math.round(centerY - context.parentBounds.y);
  } else {
    props.x = Math.round(centerX);
    props.y = Math.round(centerY);
  }

  return props;
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

export function adjustCheckBoxInstance(config: any, instanceNode: AbstractNode): void {
  const variantInfo = extractInstanceVariant(instanceNode);
  let stateValue: string | undefined;

  if (instanceNode.componentProperties) {
    for (const [key, value] of Object.entries(instanceNode.componentProperties)) {
      if (key.toLowerCase() === 'state') {
        stateValue = (value as any).value ?? value;
      }
    }
  }

  if (!stateValue && variantInfo.variant) {
    if (variantInfo.variant.includes('on')) {
      stateValue = 'on';
    } else if (variantInfo.variant.includes('off')) {
      stateValue = 'off';
    }
  }

  config.value = stateValue === 'on';
}

export function adjustRadioGroupInstance(config: any, instanceNode: AbstractNode, mainComponentNode: AbstractNode): void {
  const scaleX = instanceNode.width / mainComponentNode.width;
  const scaleY = instanceNode.height / mainComponentNode.height;

  if (config.on && mainComponentNode.children) {
    const onChild = mainComponentNode.children.find((child: AbstractNode) => child.name.toLowerCase() === 'on');
    if (onChild) {
      config.on.width = Math.round(onChild.width * scaleX);
      config.on.height = Math.round(onChild.height * scaleY);
    }
  }

  if (config.off && mainComponentNode.children) {
    const offChild = mainComponentNode.children.find((child: AbstractNode) => child.name.toLowerCase() === 'off');
    if (offChild) {
      config.off.width = Math.round(offChild.width * scaleX);
      config.off.height = Math.round(offChild.height * scaleY);
    }
  }

  if (config.elementsMargin && mainComponentNode.itemSpacing !== undefined) {
    const avgScale = (scaleX + scaleY) / 2;
    config.elementsMargin = Math.round(config.elementsMargin * avgScale);
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

const BUTTON_STATE_MAP = new Map([
  ['default', 'defaultView'],
  ['hover', 'hoverView'],
  ['pressed', 'pressedView'],
  ['disabled', 'disabledView'],
]);

export function processButtonComponentSet(
  componentSet: AbstractNode,
  context: ProcessingContext,
  processNode: ProcessNodeFn
): any {
  const componentName = componentSet.name;
  if (!componentSet.children || componentSet.children.length === 0) return null;

  const views: Record<string, any> = {};
  let textValue: string | undefined;
  let textStyle: any;
  let hasStateVariants = false;

  componentSet.children.forEach(variant => {
    if (variant.type !== 'COMPONENT') return;
    try {
      const variantProps = extractVariantProps(variant);
      const stateValue = variantProps.state?.toLowerCase?.();

      if (stateValue && BUTTON_STATE_MAP.has(stateValue)) {
        hasStateVariants = true;
        const config = processNode(variant, withContext(context, { isRootLevel: true, parentBounds: null, parentZoneInfo: null }));
        flattenButtonChildren(config);

        const viewKey = BUTTON_STATE_MAP.get(stateValue)!;
        if (config.image) {
          views[viewKey] = config.image;
        }

        if (stateValue === 'default') {
          textValue = config.text;
          textStyle = config.textStyle;
        }
      }
    } catch (error) {
      console.warn(`Error processing button variant ${variant.name}:`, error);
    }
  });

  if (!hasStateVariants) {
    return processComponentVariantsSet(componentSet, context, processNode);
  }

  const result: any = { name: componentName, type: 'Button', views };
  if (textValue !== undefined) result.text = textValue;
  if (textStyle) result.textStyle = textStyle;

  return result;
}

export function flattenButtonChildren(variantConfig: any): void {
  if (variantConfig.componentProperties?.animation !== undefined) {
    const val = variantConfig.componentProperties.animation;
    if (val === true || val === 'true') {
      variantConfig.animation = true;
    }
    delete variantConfig.componentProperties.animation;
    if (Object.keys(variantConfig.componentProperties).length === 0) {
      delete variantConfig.componentProperties;
    }
  }

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

/**
 * Process a COMPONENT_SET into either:
 * - Scene config with `modes` (viewport layouts, isScene=true)
 * - Component config with `variants` or flat (component states)
 */
export function processComponentVariantsSet(
  componentSet: AbstractNode,
  context: ProcessingContext,
  processNode: ProcessNodeFn
): any {
  const componentName = componentSet.name;
  if (!componentSet.children || componentSet.children.length === 0) return null;

  const cleanName = cleanNameFromSizeMarker(componentName);
  const typeDef = findComponentType(cleanName);
  const isScene = typeDef?.isScene === true;

  if (isScene) {
    return processSceneVariantsSet(componentSet, context, processNode, typeDef);
  }

  return processComponentVariants(componentSet, context, processNode, typeDef);
}

/**
 * Scene COMPONENT_SET → { name, type: 'Scene', modes: { default: {...}, portrait: {...} } }
 * All variants become modes (viewport layouts).
 */
function processSceneVariantsSet(
  componentSet: AbstractNode,
  context: ProcessingContext,
  processNode: ProcessNodeFn,
  typeDef: ReturnType<typeof findComponentType>
): any {
  const componentName = componentSet.name;
  const modes: any = {};

  componentSet.children!.forEach(variant => {
    if (variant.type !== 'COMPONENT') return;

    try {
      const variantProps = extractVariantProps(variant);
      const config = processNode(variant, withContext(context, { isRootLevel: true, parentBounds: null, parentZoneInfo: null }));
      const { name, type, ...modeConfig } = config;

      // Determine mode name from variant props or component name
      const modeName = resolveModeName(variantProps, variant.name);
      typeDef?.postProcess?.(modeConfig);
      modes[modeName] = { type: type || 'BaseContainer', ...modeConfig };
    } catch (error) {
      console.warn(`Error processing scene variant ${variant.name}:`, error);
    }
  });

  if (Object.keys(modes).length === 0) return null;

  return { name: componentName, type: 'Scene', modes };
}

/**
 * Resolve mode name for a Scene variant.
 * Checks variant props for viewport/orientation/layout/mode keys,
 * falls back to component name parsing, defaults to 'default'.
 */
function resolveModeName(variantProps: any, componentName: string): string {
  const supportedModes = ['default', 'portrait', 'landscape', 'desktop'];

  // Check variant property values
  for (const [key, value] of Object.entries(variantProps)) {
    const lowerKey = key.toLowerCase();
    const lowerValue = String(value).toLowerCase();

    if (lowerKey.includes('viewport') || lowerKey.includes('orientation') || lowerKey.includes('layout') || lowerKey.includes('mode')) {
      if (supportedModes.includes(lowerValue)) {
        return lowerValue;
      }
    }

    if (supportedModes.includes(lowerValue)) {
      return lowerValue;
    }
  }

  // Check component name for mode hints
  const lowerName = componentName.toLowerCase();
  for (const mode of supportedModes) {
    if (new RegExp(`\\b${mode}\\b`).test(lowerName)) {
      return mode;
    }
  }

  return 'default';
}

/**
 * Regular component COMPONENT_SET → { name, type, variants } or flat config.
 * Variant keys come from component variant properties (state, size, etc.).
 * Never uses viewport classification.
 */
function processComponentVariants(
  componentSet: AbstractNode,
  context: ProcessingContext,
  processNode: ProcessNodeFn,
  typeDef: ReturnType<typeof findComponentType>
): any {
  const componentName = componentSet.name;
  const configs: { config: any; variantProps: any; variantName: string }[] = [];

  componentSet.children!.forEach(variant => {
    if (variant.type !== 'COMPONENT') return;

    try {
      const variantProps = extractVariantProps(variant);
      const config = processNode(variant, withContext(context, { isRootLevel: true, parentBounds: null, parentZoneInfo: null }));
      configs.push({ config, variantProps, variantName: variant.name });
    } catch (error) {
      console.warn(`Error processing variant ${variant.name}:`, error);
    }
  });

  if (configs.length === 0) return null;

  // Determine root type
  let rootType: string;
  if (typeDef?.type) {
    rootType = typeDef.type;
  } else {
    const firstVariant = componentSet.children!.find(child => child.type === 'COMPONENT');
    if (firstVariant && 'layoutMode' in firstVariant && firstVariant.layoutMode && firstVariant.layoutMode !== 'NONE') {
      rootType = 'AutoLayout';
    } else {
      rootType = 'SuperContainer';
    }
  }

  // Single variant → flat output
  if (configs.length === 1) {
    const { config } = configs[0];
    const { name, type, ...variantConfig } = config;
    typeDef?.postProcess?.(variantConfig);
    return { name: componentName, type: rootType, ...variantConfig };
  }

  // Multiple variants → build keyed variants object
  const variantKeys = configs.map(({ variantProps, variantName }) => {
    if (variantProps && Object.keys(variantProps).length > 0) {
      const values = Object.values(variantProps);
      if (values.length === 1) return String(values[0]);
      return Object.entries(variantProps)
        .map(([k, v]) => `${k}=${v}`)
        .join(',');
    }
    if (variantName) return String(variantName);
    return null;
  });

  const allHaveKeys = variantKeys.every((k): k is string => k !== null);
  const allUnique = allHaveKeys && new Set(variantKeys).size === variantKeys.length;

  const variants: any = {};

  if (allHaveKeys && allUnique) {
    configs.forEach(({ config }, i) => {
      const { name, type, ...variantConfig } = config;
      typeDef?.postProcess?.(variantConfig);
      variants[variantKeys[i]] = variantConfig;
    });
  } else {
    // Fallback: array
    variants.default = configs.map(({ config }) => {
      const { name, type, ...variantConfig } = config;
      typeDef?.postProcess?.(variantConfig);
      return variantConfig;
    });
  }

  return { name: componentName, type: rootType, variants };
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

// --- Spine ---

/**
 * Post-process hook for Spine instances.
 * Transforms componentProperties into SpineAnimation params format.
 *
 * Figma component "Spine" has these component properties:
 *   - spine (TEXT): skeleton name (alias from assets/spine/)
 *   - animation (TEXT): animation name
 *   - autoPlay (BOOLEAN): auto-play on init
 *   - loop (BOOLEAN): loop animation
 *   - skin (TEXT): optional skin name
 *
 * Input (from processInstance):
 *   { type: "Spine", componentProperties: { spine: "coin", animation: "idle", ... } }
 *
 * Output:
 *   { type: "SpineAnimation", params: { spine: "coin", animation: "idle", ... } }
 */
export function postProcessSpine(config: any): void {
  const cp = config.componentProperties;
  if (!cp) return;

  config.type = 'SpineAnimation';

  const params: any = {};
  if (cp.spine) params.spine = cp.spine;
  if (cp.animation) params.animation = cp.animation;
  if (cp.autoPlay === true || cp.autoPlay === 'true') params.autoPlay = true;
  if (cp.loop === true || cp.loop === 'true') params.loop = true;
  if (cp.skin) params.skin = cp.skin;

  config.params = params;
  delete config.componentProperties;
  delete config.isInstance;
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

export function processReelsConfig(node: AbstractNode, context: ProcessingContext, processNode: ProcessNodeFn): any {
  const componentName = node.name;
  if (!('children' in node) || !node.children || node.children.length === 0) return null;

  try {
    const reelsConfig: any = { name: componentName, type: 'Reels' };

    // Find reels container: child named "reels" or the node itself
    let reelsContainer: AbstractNode | null = null;

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
        reelsContainer = child;
      }
    });

    // If no "reels" child found, use the node itself as reels container
    if (!reelsContainer) {
      reelsContainer = node;
    }

    const container = reelsContainer as AbstractNode;
    if (!('children' in container) || !container.children || container.children.length === 0) {
      return reelsConfig;
    }

    // Calculate reels offset (padding or position)
    const reelsX = container === node ? 0 : Math.round(container.x);
    const reelsY = container === node ? 0 : Math.round(container.y);

    // Find column children: FRAMEs/INSTANCEs with children, sorted by x
    const columnChildren = container.children
      .filter((child: AbstractNode) => {
        const hasChildren = 'children' in child && child.children && child.children.length > 0;
        const isContainer = child.type === 'FRAME' || child.type === 'INSTANCE' || child.type === 'COMPONENT';
        return hasChildren && isContainer;
      })
      .sort((a: AbstractNode, b: AbstractNode) => a.x - b.x);

    if (columnChildren.length === 0) {
      return reelsConfig;
    }

    // Get symbol dimensions from first cell of first column
    const firstColumn = columnChildren[0];
    const firstCell = firstColumn.children![0];
    const symbolWidth = Math.round(firstCell.width);
    const symbolHeight = Math.round(firstCell.height);

    // Build columns array
    const columns = columnChildren.map((col: AbstractNode) => ({
      x: Math.round(col.x),
      rows: col.children!.length,
      width: Math.round(col.width),
    }));

    reelsConfig.reels = {
      x: reelsX,
      y: reelsY,
      symbolWidth,
      symbolHeight,
      rows: columns[0].rows,
      columns,
    };

    return reelsConfig;
  } catch (error) {
    console.warn(`Error processing ReelsConfig component ${componentName}:`, error);
    return null;
  }
}
