import type { AbstractNode, ComponentMapEntry } from '../adapters/types';
import {
  calculateTextPositioning,
  cleanNameFromSizeMarker,
  extractAutoLayoutProps,
  extractCommonProps,
  extractCornerProps,
  extractFillProps,
  extractInstanceVariant,
  extractStrokeProps,
  extractTextBlockProps,
  extractTextProps,
  extractZoneChildProps,
  isRadioGroup,
  isScrollBox,
  isValueSlider
} from '../extractors';
import { isSpecialZone, SKIP_NODE_NAME } from './constants';
import { applyRelativePosition } from './coordinateUtils';
import { getContainerBounds, getDirectZoneContext, withContext } from './ProcessingContext';
import { ProcessingContext } from './types';
import {
  processProgressBar,
  processRadioGroup,
  processScrollBox,
  processValueSlider
} from '../handlers/special/specialProcessors';

/**
 * Processes Figma nodes into export-ready JSON objects.
 * Uses simple if/else dispatch for special cases, with a generic handler as fallback.
 */
export class NodeProcessor {
  process(node: AbstractNode, context: ProcessingContext): any {
    let result: any;

    // Special case: ProgressBar (non-root)
    if (cleanNameFromSizeMarker(node.name).endsWith('ProgressBar') && !context.isRootLevel) {
      result = processProgressBar(node, context, (n, c) => this.process(n, c));
      if (result) {
        applyRelativePosition(result, node, context.parentBounds);
      }
    }
    // Special case: ScrollBox (non-root)
    else if (isScrollBox(node.name) && !context.isRootLevel) {
      result = processScrollBox(node, context, (n, c) => this.process(n, c));
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

    return result;
  }

  private processInstance(node: AbstractNode, context: ProcessingContext): any {
    var parentComponentInfo: ComponentMapEntry = { name: 'Component', width: 0, height: 0, node: undefined };

    if (node.mainComponentId && context.componentMap.has(node.mainComponentId)) {
      parentComponentInfo = context.componentMap.get(node.mainComponentId)!;
    }

    var mainComponentNode = parentComponentInfo.node;

    if (isValueSlider(parentComponentInfo.name) && mainComponentNode) {
      var valueSliderConfig = processValueSlider(
        mainComponentNode,
        withContext(context, { isRootLevel: false, parentBounds: null, parentZoneInfo: null }),
        (n, c) => this.process(n, c)
      );
      if (valueSliderConfig) {
        valueSliderConfig.name = cleanNameFromSizeMarker(node.name);
        applyRelativePosition(valueSliderConfig, node, context.parentBounds);
        return valueSliderConfig;
      }
    }

    if (isRadioGroup(parentComponentInfo.name) && mainComponentNode) {
      var radioGroupConfig = processRadioGroup(
        mainComponentNode,
        withContext(context, { isRootLevel: false, parentBounds: null, parentZoneInfo: null }),
        (n, c) => this.process(n, c)
      );
      if (radioGroupConfig) {
        radioGroupConfig.name = cleanNameFromSizeMarker(node.name);
        applyRelativePosition(radioGroupConfig, node, context.parentBounds);

        var scaleX = node.width / mainComponentNode.width;
        var scaleY = node.height / mainComponentNode.height;

        if (radioGroupConfig.on && mainComponentNode.children) {
          var onChild = mainComponentNode.children.find(function(child) { return child.name.toLowerCase() === 'on'; });
          if (onChild) {
            radioGroupConfig.on.width = Math.round(onChild.width * scaleX);
            radioGroupConfig.on.height = Math.round(onChild.height * scaleY);
          }
        }

        if (radioGroupConfig.off && mainComponentNode.children) {
          var offChild = mainComponentNode.children.find(function(child) { return child.name.toLowerCase() === 'off'; });
          if (offChild) {
            radioGroupConfig.off.width = Math.round(offChild.width * scaleX);
            radioGroupConfig.off.height = Math.round(offChild.height * scaleY);
          }
        }

        if (radioGroupConfig.elementsMargin && mainComponentNode.itemSpacing !== undefined) {
          var avgScale = (scaleX + scaleY) / 2;
          radioGroupConfig.elementsMargin = Math.round(radioGroupConfig.elementsMargin * avgScale);
        }

        return radioGroupConfig;
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

    props.width = Math.round(node.width);
    props.height = Math.round(node.height);

    if (cleanNameFromSizeMarker(parentComponentInfo.name).endsWith('Toggle')) {
      var variantInfo = extractInstanceVariant(node);
      if (node.componentProperties) {
        Object.entries(node.componentProperties).forEach(function(entry) {
          var key = entry[0];
          var value = entry[1];
          if (key.toLowerCase() === 'state') {
            props.state = (value as any).value || value;
          }
        });
      }

      if (!props.state && variantInfo.variant) {
        if (variantInfo.variant.includes('on')) {
          props.state = 'on';
        } else if (variantInfo.variant.includes('off')) {
          props.state = 'off';
        }
      }

      if (!props.state) {
        props.state = 'off';
      }
    } else {
      Object.assign(props, extractInstanceVariant(node));
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
        if (props.type === 'TextBlock') {
          Object.assign(props, extractTextBlockProps(node));
          var textBlockPos = calculateTextPositioning(node, true);
          if (textBlockPos.alignItems) {
            props.style.alignItems = textBlockPos.alignItems;
          }
        } else {
          Object.assign(props, extractTextProps(node));
          var textPos = calculateTextPositioning(node, false);
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
        }
        break;
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

    return props;
  }
}
