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
  extractLineProps,
  isStraightStrokeOnlyVector,
  isStrokeOnlyVector,
  NODE_TYPE_MAPPING,
  resolveVariantFromMainComponent,
  extractStrokeProps,
  extractTextProps,
  extractZoneChildProps,
} from '../extractors';
import { findComponentType } from './componentRegistry';
import { isSpecialZone, SKIP_NODE_NAME } from './constants';
import { applyRelativePosition, computeScale, getUnrotatedDimensions } from './coordinateUtils';
import { addDiagnostic, getContainerBounds, getDirectZoneContext, withContext } from './ProcessingContext';
import { ProcessingContext } from './types';

/**
 * Processes Figma nodes into export-ready JSON objects.
 * Uses simple if/else dispatch for special cases, with a generic handler as fallback.
 */
export class NodeProcessor {
  /**
   * Обработка узла для спец-обработчиков: всегда возвращает объект.
   * Пропущенный узел (например, Line без обводки) заменяется пустым контейнером,
   * чтобы обработчики, рассчитывающие на объект, не падали.
   */
  process(node: AbstractNode, context: ProcessingContext): any {
    const result = this.processOrSkip(node, context);
    return result ?? { name: cleanNameFromSizeMarker(node.name), type: 'SuperContainer' };
  }

  /**
   * Обработка узла; возвращает null, если узел нужно пропустить (предупреждение уже записано).
   */
  processOrSkip(node: AbstractNode, parentContext: ProcessingContext): any {
    // Путь до узла нужен для предупреждений
    const context = withContext(parentContext, { nodePath: [...parentContext.nodePath, node.name] });
    let result: any;

    // Check registry for special component types (non-root only)
    const typeDef = !context.isRootLevel ? findComponentType(node.name) : null;

    if (typeDef?.process && !context.isRootLevel) {
      result = typeDef.process(node, context, (n, c) => this.process(n, c));
      if (result) {
        if (result._skipPosition) {
          delete result._skipPosition;
        } else {
          applyRelativePosition(result, node, context.parentBounds);
        }
      }
    }
    // Special case: Instance
    else if (node.type === 'INSTANCE') {
      result = this.processInstance(node, context);
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
    let parentComponentInfo: ComponentMapEntry = { name: 'Component', width: 0, height: 0, node: undefined };

    if (node.mainComponentId && context.componentMap.has(node.mainComponentId)) {
      parentComponentInfo = context.componentMap.get(node.mainComponentId)!;
    }

    const mainComponentNode = parentComponentInfo.node;

    // Check registry for instance types that need special processing
    const instanceTypeDef = findComponentType(parentComponentInfo.name);
    if (instanceTypeDef?.handleInstance && instanceTypeDef.process && mainComponentNode) {
      const specialConfig = instanceTypeDef.process(
        mainComponentNode,
        withContext(context, { isRootLevel: false, parentBounds: null, parentZoneInfo: null }),
        (n: AbstractNode, c: ProcessingContext) => this.process(n, c)
      );
      if (specialConfig) {
        specialConfig.name = cleanNameFromSizeMarker(node.name);
        applyRelativePosition(specialConfig, node, context.parentBounds);
        instanceTypeDef.adjustInstance?.(specialConfig, node, mainComponentNode);
        return specialConfig;
      }
    }

    const props: any = {
      name: cleanNameFromSizeMarker(node.name),
      type: parentComponentInfo.name,
      isInstance: true
    };

    applyRelativePosition(props, node, context.parentBounds);

    const commonProps = extractCommonProps(node, false, context.parentBounds);
    const { type: _, ...commonPropsWithoutType } = commonProps;
    Object.assign(props, {
      ...commonPropsWithoutType,
      x: props.x,
      y: props.y,
      type: props.type
    });

    // For rotated instances, absoluteBoundingBox swaps width/height at 90°/270°.
    const { origW, origH } = getUnrotatedDimensions(node);
    props.width = Math.round(origW);
    props.height = Math.round(origH);

    // Compute scale relative to the original component
    const scale = computeScale(props.width, props.height, parentComponentInfo.width, parentComponentInfo.height);
    if (scale !== undefined) props.scale = scale;

    const parentTypeDef = findComponentType(parentComponentInfo.name);
    if (parentTypeDef?.adjustInstance) {
      parentTypeDef.adjustInstance(props, node, mainComponentNode!);
    } else {
      Object.assign(props, extractInstanceVariant(node));
    }

    // Fallback: resolve variant from mainComponent's variantProperties
    // Only for COMPONENT_SET variants (componentMap stores SET name, differs from variant node name)
    // Skip types with adjustInstance — they handle variant/state themselves
    const isComponentSetVariant = mainComponentNode && parentComponentInfo.name !== mainComponentNode.name;
    if (!props.variant && isComponentSetVariant && !parentTypeDef?.adjustInstance) {
      const resolvedVariant = resolveVariantFromMainComponent(mainComponentNode);
      if (resolvedVariant) {
        props.variant = resolvedVariant;
      }
    }

    // Export Figma component properties
    const componentProps = extractComponentProps(node);
    if (componentProps) {
      props.componentProperties = componentProps;
    }

    return props;
  }

  private processBaseNode(node: AbstractNode, context: ProcessingContext): any {
    const props: any = extractCommonProps(node, context.isRootLevel, context.parentBounds);

    // Тип узла без маппинга уходит в конфиг как есть, движок заменит его пустым контейнером
    if (!context.isRootLevel && props.type === node.type && !(node.type in NODE_TYPE_MAPPING)) {
      addDiagnostic(context, `тип узла ${node.type} не поддерживается экспортёром, выгружен как type="${props.type}"`);
    }

    // AutoLayout props apply to any node with layoutMode (FRAME, COMPONENT, COMPONENT_SET)
    if (props.type === 'AutoLayout') {
      Object.assign(props, extractAutoLayoutProps(node));
    }

    switch (node.type) {
      case 'FRAME':
        break;
      case 'TEXT':
        Object.assign(props, extractTextProps(node));
        if (props.type === 'BitmapText') {
          // BitmapText has priority over EngineText — drop maxWidth (not supported)
          delete props.maxWidth;
        } else if (props.maxWidth) {
          props.type = 'EngineText';
        }
        const textPos = calculateTextPositioning(node);
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
      case 'LINE':
        return this.buildLine(node, props, context);
      case 'RECTANGLE':
      case 'ELLIPSE':
      case 'VECTOR': {
        if (node.type === 'VECTOR') {
          if (isStraightStrokeOnlyVector(node)) {
            return this.buildLine(node, props, context);
          }
          if (isStrokeOnlyVector(node)) {
            addDiagnostic(
              context,
              'VECTOR только с обводкой не является прямым горизонтальным или вертикальным отрезком: выгружен как Graphics без геометрии'
            );
          }
        }
        const fillProps = extractFillProps(node);
        const style: any = {};
        Object.assign(style, fillProps);
        Object.assign(style, extractStrokeProps(node));
        if (node.type === 'RECTANGLE') Object.assign(style, extractCornerProps(node));
        if (props.alpha !== undefined) {
          style.alpha = props.alpha;
          delete props.alpha;
        }
        if (Object.keys(style).length > 0) {
          props.style = style;
        }

        // Filled VECTOR (background panel) → render as Rectangle with bounding box
        // Stroke-only VECTOR (lines/arrows) → keep as Graphics, no dimensions
        if (node.type === 'VECTOR' && Object.keys(fillProps).length > 0) {
          props.type = 'Rectangle';
          props.width = Math.round(node.width);
          props.height = Math.round(node.height);
        }
        break;
      }
    }

    let shouldExportChildren: boolean;
    if (context.isRootLevel) {
      shouldExportChildren = true;
    } else {
      const containerTypes = ['GROUP', 'FRAME'];
      const componentTypes = ['COMPONENT', 'COMPONENT_SET', 'INSTANCE'];
      shouldExportChildren = containerTypes.indexOf(node.type) !== -1 || componentTypes.indexOf(node.type) === -1;
    }

    if (node.children && node.children.length > 0 && shouldExportChildren) {
      const parentBounds = getContainerBounds(node);
      const zoneType = isSpecialZone(props.type);
      props.children = [];
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (child.name === SKIP_NODE_NAME) continue;

        const zoneInfoForChild = zoneType ? getDirectZoneContext(props.type, node) : null;
        const childContext = withContext(context, {
          parentBounds: parentBounds,
          isRootLevel: false,
          parentZoneInfo: zoneInfoForChild
        });
        const childProps = this.processOrSkip(child, childContext);
        if (!childProps) continue;
        if (zoneType && node.type === 'FRAME') {
          const zoneProps = extractZoneChildProps(child, node);
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

  /**
   * LINE и прямой stroke-only VECTOR → Line. x/y/angle перезаписываются результатом
   * lineGeometry после extractCommonProps, поэтому correctRotatedPosition (рассчитанный
   * на прямоугольник) к линии не применяется. alpha и visible остаются от extractCommonProps.
   * Координаты берутся из preciseBounds относительно прямого родителя: RestNodeAdapter уже
   * отдаёт их в системе родителя (в том числе для GROUP), поэтому parentBounds не вычитается.
   */
  private buildLine(node: AbstractNode, common: any, context: ProcessingContext): any | null {
    const line = extractLineProps(node, message => addDiagnostic(context, message));
    if (!line) return null;

    const result: any = { name: common.name, type: 'Line' };
    if (!context.isRootLevel) {
      result.x = line.x;
      result.y = line.y;
    }
    result.length = line.length;
    if (line.angle !== undefined) result.angle = line.angle;
    if (common.visible === false) result.visible = false;
    if (common.alpha !== undefined) result.alpha = common.alpha;
    result.style = line.style;
    return result;
  }
}
