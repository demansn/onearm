import type { AbstractNode, ComponentMapEntry } from '../adapters/types';
import {
  calculateTextPositioning,
  cleanNameFromSizeMarker,
  extractAutoLayoutProps,
  extractCommonProps,
  extractComponentProps,
  extractCornerProps,
  extractFillProps,
  extractInstanceVariant,
  resolveVariantFromMainComponent,
  extractStrokeProps,
  extractTextProps,
  extractZoneChildProps,
} from '../extractors';
import { findComponentType } from './componentRegistry';
import { isSpecialZone, SKIP_NODE_NAME } from './constants';
import { applyRelativePosition, getUnrotatedDimensions } from './coordinateUtils';
import { getContainerBounds, getDirectZoneContext, withContext } from './ProcessingContext';
import { ProcessingContext } from './types';

/**
 * Processes Figma nodes into export-ready JSON objects.
 * Uses simple if/else dispatch for special cases, with a generic handler as fallback.
 */
export class NodeProcessor {
  process(node: AbstractNode, context: ProcessingContext): any {
    let result: any;

    // Check registry for special component types (non-root only)
    const typeDef = !context.isRootLevel ? findComponentType(node.name) : null;

    if (typeDef?.process && !context.isRootLevel) {
      result = typeDef.process(node, context, (n, c) => this.process(n, c));
      if (result) {
        applyRelativePosition(result, node, context.parentBounds);
      }
    }
    // Special case: Instance
    else if (node.type === 'INSTANCE') {
      result = this.processInstance(node, context);
    }
    // Special case: Placeholder
    else if (node.name && node.name.endsWith('_ph')) {
      result = this.processPlaceholder(node, context);
    }
    // Default: generic node processing
    else {
      result = this.processBaseNode(node, context);
    }

    // Inline cleanup: remove empty children arrays
    if (result && typeof result === 'object' && Array.isArray(result.children) && result.children.length === 0) {
      delete result.children;
    }

    // Post-process hook (e.g. flatten Button children)
    if (result) {
      const postTypeDef = findComponentType(result.type || '');
      postTypeDef?.postProcess?.(result);
    }

    return result;
  }

  private processInstance(node: AbstractNode, context: ProcessingContext): any {
    var parentComponentInfo: ComponentMapEntry = { name: 'Component', width: 0, height: 0, node: undefined };

    if (node.mainComponentId && context.componentMap.has(node.mainComponentId)) {
      parentComponentInfo = context.componentMap.get(node.mainComponentId)!;
    }

    var mainComponentNode = parentComponentInfo.node;

    // Check registry for instance types that need special processing
    var instanceTypeDef = findComponentType(parentComponentInfo.name);
    if (instanceTypeDef?.handleInstance && instanceTypeDef.process && mainComponentNode) {
      var specialConfig = instanceTypeDef.process(
        mainComponentNode,
        withContext(context, { isRootLevel: false, parentBounds: null, parentZoneInfo: null }),
        (n: AbstractNode, c: ProcessingContext) => this.process(n, c)
      );
      if (specialConfig) {
        specialConfig.name = cleanNameFromSizeMarker(node.name);
        applyRelativePosition(specialConfig, node, context.parentBounds);

        // RadioGroup-specific: scale children proportionally
        if (instanceTypeDef.type === 'RadioGroup') {
          var scaleX = node.width / mainComponentNode.width;
          var scaleY = node.height / mainComponentNode.height;

          if (specialConfig.on && mainComponentNode.children) {
            var onChild = mainComponentNode.children.find(function(child: AbstractNode) { return child.name.toLowerCase() === 'on'; });
            if (onChild) {
              specialConfig.on.width = Math.round(onChild.width * scaleX);
              specialConfig.on.height = Math.round(onChild.height * scaleY);
            }
          }

          if (specialConfig.off && mainComponentNode.children) {
            var offChild = mainComponentNode.children.find(function(child: AbstractNode) { return child.name.toLowerCase() === 'off'; });
            if (offChild) {
              specialConfig.off.width = Math.round(offChild.width * scaleX);
              specialConfig.off.height = Math.round(offChild.height * scaleY);
            }
          }

          if (specialConfig.elementsMargin && mainComponentNode.itemSpacing !== undefined) {
            var avgScale = (scaleX + scaleY) / 2;
            specialConfig.elementsMargin = Math.round(specialConfig.elementsMargin * avgScale);
          }
        }

        return specialConfig;
      }
    }

    var props: any = {
      name: cleanNameFromSizeMarker(node.name),
      type: parentComponentInfo.name,
      isInstance: true
    };

    applyRelativePosition(props, node, context.parentBounds);

    var commonProps = extractCommonProps(node, false, context.parentBounds);
    var { type: _, ...commonPropsWithoutType } = commonProps;
    Object.assign(props, {
      ...commonPropsWithoutType,
      x: props.x,
      y: props.y,
      type: props.type
    });

    // For rotated instances, absoluteBoundingBox swaps width/height at 90°/270°.
    var { origW, origH } = getUnrotatedDimensions(node);
    props.width = Math.round(origW);
    props.height = Math.round(origH);

    // Compute scale relative to the original component
    if (parentComponentInfo.width > 0 && parentComponentInfo.height > 0) {
      const scaleX = props.width / parentComponentInfo.width;
      const scaleY = props.height / parentComponentInfo.height;

      if (scaleX !== 1 || scaleY !== 1) {
        const roundedX = Math.round(scaleX * 1000) / 1000;
        const roundedY = Math.round(scaleY * 1000) / 1000;

        if (roundedX === roundedY) {
          props.scale = roundedX;
        } else {
          props.scale = { x: roundedX, y: roundedY };
        }
      }
    }

    var parentTypeDef = findComponentType(parentComponentInfo.name);
    if (parentTypeDef?.type === 'CheckBoxComponent') {
      var variantInfo = extractInstanceVariant(node);
      var stateValue: string | undefined;

      if (node.componentProperties) {
        Object.entries(node.componentProperties).forEach(function(entry) {
          var key = entry[0];
          var value = entry[1];
          if (key.toLowerCase() === 'state') {
            stateValue = (value as any).value ?? value;
          }
        });
      }

      if (!stateValue && variantInfo.variant) {
        if (variantInfo.variant.includes('on')) {
          stateValue = 'on';
        } else if (variantInfo.variant.includes('off')) {
          stateValue = 'off';
        }
      }

      props.value = stateValue === 'on';
    } else {
      Object.assign(props, extractInstanceVariant(node));
    }

    // Fallback: resolve variant from mainComponent's variantProperties
    // Only for COMPONENT_SET variants (componentMap stores SET name, differs from variant node name)
    // Skip CheckBoxComponent — state is handled via value field, not variant
    var isComponentSetVariant = mainComponentNode && parentComponentInfo.name !== mainComponentNode.name;
    if (!props.variant && isComponentSetVariant && parentTypeDef?.type !== 'CheckBoxComponent') {
      var resolvedVariant = resolveVariantFromMainComponent(mainComponentNode);
      if (resolvedVariant) {
        props.variant = resolvedVariant;
      }
    }

    // Export Figma component properties
    var componentProps = extractComponentProps(node);
    if (componentProps) {
      props.componentProperties = componentProps;
    }

    return props;
  }

  private processPlaceholder(node: AbstractNode, context: ProcessingContext): any {
    var props: any = {
      name: cleanNameFromSizeMarker(node.name),
      type: 'SuperContainer'
    };
    var centerX = node.x + node.width / 2;
    var centerY = node.y + node.height / 2;

    if (context.parentBounds) {
      props.x = Math.round(centerX - context.parentBounds.x);
      props.y = Math.round(centerY - context.parentBounds.y);
    } else {
      props.x = Math.round(centerX);
      props.y = Math.round(centerY);
    }

    return props;
  }

  private processBaseNode(node: AbstractNode, context: ProcessingContext): any {
    var props: any = extractCommonProps(node, context.isRootLevel, context.parentBounds);

    switch (node.type) {
      case 'FRAME':
        if (props.type === 'AutoLayout') {
          Object.assign(props, extractAutoLayoutProps(node));
        }
        break;
      case 'TEXT':
        Object.assign(props, extractTextProps(node));
        if (props.maxWidth) {
          props.type = 'EngineText';
        }
        var textPos = calculateTextPositioning(node);
        if (textPos.anchorX !== undefined) {
          props.anchorX = textPos.anchorX;
        }
        if (textPos.anchorY !== undefined) {
          props.anchorY = textPos.anchorY;
        }
        if (textPos.adjustedX !== undefined) {
          if (context.parentBounds) {
            props.x = Math.round(textPos.adjustedX - context.parentBounds.x);
          } else {
            props.x = textPos.adjustedX;
          }
        }
        if (textPos.adjustedY !== undefined) {
          if (context.parentBounds) {
            props.y = Math.round(textPos.adjustedY - context.parentBounds.y);
          } else {
            props.y = textPos.adjustedY;
          }
        }
        break;
      case 'RECTANGLE': {
        const style: any = {};
        Object.assign(style, extractFillProps(node));
        Object.assign(style, extractStrokeProps(node));
        Object.assign(style, extractCornerProps(node));
        if (props.alpha !== undefined) {
          style.alpha = props.alpha;
          delete props.alpha;
        }
        if (Object.keys(style).length > 0) {
          props.style = style;
        }
        break;
      }
      case 'ELLIPSE':
      case 'VECTOR': {
        const style: any = {};
        Object.assign(style, extractFillProps(node));
        Object.assign(style, extractStrokeProps(node));
        if (props.alpha !== undefined) {
          style.alpha = props.alpha;
          delete props.alpha;
        }
        if (Object.keys(style).length > 0) {
          props.style = style;
        }
        break;
      }
    }

    var shouldExportChildren: boolean;
    if (context.isRootLevel) {
      shouldExportChildren = true;
    } else {
      var containerTypes = ['GROUP', 'FRAME'];
      var componentTypes = ['COMPONENT', 'COMPONENT_SET', 'INSTANCE'];
      shouldExportChildren = containerTypes.indexOf(node.type) !== -1 || componentTypes.indexOf(node.type) === -1;
    }

    if (node.children && node.children.length > 0 && shouldExportChildren) {
      var parentBounds = getContainerBounds(node);
      var zoneType = isSpecialZone(props.type);
      var self = this;
      props.children = [];
      for (var i = 0; i < node.children.length; i++) {
        var child = node.children[i];
        if (child.name === SKIP_NODE_NAME) continue;

        var zoneInfoForChild = zoneType ? getDirectZoneContext(props.type, node) : null;
        var childContext = withContext(context, {
          parentBounds: parentBounds,
          isRootLevel: false,
          parentZoneInfo: zoneInfoForChild
        });
        var childProps = self.process(child, childContext);
        if (zoneType && node.type === 'FRAME') {
          var zoneProps = extractZoneChildProps(child, node);
          Object.assign(childProps, zoneProps);
          delete childProps.x;
          delete childProps.y;
        }
        props.children.push(childProps);
      }
    }

    // Inject synthetic mask for frames with clipContent (only if no manual "mask" child exists)
    if (node.type === 'FRAME' && node.clipsContent && !context.isRootLevel) {
      const hasManualMask = props.children && props.children.some(
        (child: any) => child.name && child.name.toLowerCase() === 'mask'
      );

      if (!hasManualMask) {
        if (!props.children) props.children = [];

        const maskStyle: any = { fill: '#ffffff' };
        if (typeof node.cornerRadius === 'number' && node.cornerRadius > 0) {
          maskStyle.cornerRadius = node.cornerRadius;
        }

        props.children.push({
          name: 'mask',
          type: 'Rectangle',
          x: 0,
          y: 0,
          width: Math.round(node.width),
          height: Math.round(node.height),
          style: maskStyle
        });
      }
    }

    return props;
  }
}
