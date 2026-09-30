/**
 * @fileoverview Извлечение компонента `Line` из узлов LINE и прямых stroke-only VECTOR.
 * Формат конфига и правила: docs/line-support-spec.md §3, §4.
 */

import type { AbstractNode, Paint } from './types';
import { isMixed } from '../adapters/mixed';
import { colorToHex } from './colorUtils';
import { computeLineGeometry } from '../core/lineGeometry';

export type LineStyle = {
  stroke: string;
  strokeWidth: number;
  cap?: 'butt' | 'round' | 'square';
};

export type LineProps = {
  x: number;
  y: number;
  length: number;
  angle?: number;
  style: LineStyle;
};

export type Warn = (message: string) => void;

const DEGENERATE_EPS = 1e-3;

function round(value: number, digits: number): number {
  const k = Math.pow(10, digits);
  return Math.round(value * k) / k;
}

function visiblePaints(paints: readonly Paint[] | unknown): readonly Paint[] {
  if (!paints || isMixed(paints as any) || !Array.isArray(paints)) return [];
  return (paints as readonly Paint[]).filter(p => p.visible !== false);
}

/**
 * VECTOR только с обводкой: нет видимых заливок, есть хотя бы одна видимая обводка.
 */
export function isStrokeOnlyVector(node: AbstractNode): boolean {
  return (
    node.type === 'VECTOR' &&
    visiblePaints(node.fills).length === 0 &&
    visiblePaints(node.strokes).length > 0
  );
}

/**
 * Прямой отрезок: stroke-only VECTOR с ровно одной видимой обводкой,
 * у которого одна из сторон размера равна нулю.
 * Без `size` (обычный REST-ответ) используется bounding box: у отрезка вдоль оси
 * одна из его сторон вырождена.
 */
export function isStraightStrokeOnlyVector(node: AbstractNode): boolean {
  if (!isStrokeOnlyVector(node) || visiblePaints(node.strokes).length !== 1) return false;
  if (node.size) return node.size.x === 0 || node.size.y === 0;
  const b = node.preciseBounds;
  if (!b) return false;
  return Math.abs(b.width) < DEGENERATE_EPS || Math.abs(b.height) < DEGENERATE_EPS;
}

/**
 * Стиль линии. `paint.opacity` учитывается только здесь (остальные типы — без изменений).
 * Возвращает null, если нет поддерживаемой видимой обводки или толщина не положительна.
 */
export function extractLineStyle(node: AbstractNode, warn: Warn): LineStyle | null {
  const stroke = visiblePaints(node.strokes)[0];
  if (!stroke) {
    warn('Line пропущена: нет видимой обводки');
    return null;
  }

  const weight = typeof node.strokeWeight === 'number' ? node.strokeWeight : 0;
  const strokeWidth = round(weight, 2);
  if (!(strokeWidth > 0)) {
    warn('Line пропущена: нулевая толщина обводки');
    return null;
  }

  const paintOpacity = stroke.opacity ?? 1;
  let color: string;
  if (stroke.type === 'SOLID' && stroke.color) {
    color = colorToHex(stroke.color, round((stroke.color.a ?? 1) * paintOpacity, 3));
  } else if (
    (stroke.type === 'GRADIENT_LINEAR' || stroke.type === 'GRADIENT_RADIAL' || stroke.type === 'GRADIENT_ANGULAR') &&
    stroke.gradientStops && stroke.gradientStops.length > 0
  ) {
    const first = stroke.gradientStops[0].color;
    color = colorToHex(first, round((first.a ?? 1) * paintOpacity, 3));
    warn(`Line: градиентная обводка (${stroke.type}) не поддерживается, взят цвет первого стопа`);
  } else {
    warn(`Line пропущена: неподдерживаемый тип обводки ${stroke.type}`);
    return null;
  }

  const style: LineStyle = { stroke: color, strokeWidth };

  const cap = node.strokeCap;
  if (cap === 'ROUND') style.cap = 'round';
  else if (cap === 'SQUARE') style.cap = 'square';
  else if (cap === undefined || cap === 'NONE') style.cap = 'butt';
  else {
    style.cap = 'butt';
    warn(`Line: концы штриха strokeCap=${cap} (стрелка или маркер) не поддерживаются, использован butt`);
  }

  if (node.strokeDashes && node.strokeDashes.length > 0) {
    warn(`Line: пунктир (strokeDashes=[${node.strokeDashes.join(', ')}]) не поддерживается, линия сплошная`);
  }

  return style;
}

/**
 * Параметры `Line` для узла LINE или прямого stroke-only VECTOR.
 * Координаты относительно прямого родителя узла (как отдаёт RestNodeAdapter),
 * без округления до целых: округление до 2 знаков.
 * Возвращает null, если узел нужно пропустить (предупреждение уже записано).
 */
export function extractLineProps(node: AbstractNode, warn: Warn): LineProps | null {
  const style = extractLineStyle(node, warn);
  if (!style) return null;

  const bounds = node.preciseBounds;
  if (!bounds) {
    warn('Line пропущена: у узла нет absoluteBoundingBox');
    return null;
  }

  const rotation = typeof node.rotation === 'number' ? node.rotation : 0;
  const geometry = computeLineGeometry({
    kind: node.type === 'LINE' ? 'LINE' : 'VECTOR',
    bounds,
    rotation,
    strokeWeight: style.strokeWidth,
    strokeAlign: node.strokeAlign,
    size: node.size,
    relativeTransform: node.relativeTransform
  });

  if (!geometry.ok) {
    warn(`Line пропущена: ${geometry.reason}`);
    return null;
  }

  if (geometry.alignWarning) {
    warn(`Line: strokeAlign=${node.strokeAlign} не проверен, линия посчитана как CENTER (положение может отличаться)`);
  }

  const props: LineProps = { x: geometry.x, y: geometry.y, length: geometry.length, style };
  if (geometry.angle !== 0) props.angle = geometry.angle;
  return props;
}
