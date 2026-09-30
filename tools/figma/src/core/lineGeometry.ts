/**
 * @fileoverview Чистая геометрия линии Figma → параметры компонента `Line`.
 *
 * Без импортов из проекта: файл исполняется напрямую в Node (`npm run test:figma`).
 * Описание алгоритма: docs/line-support-spec.md §4.3.
 *
 * Важно: обычный ответ REST API (`GET /v1/files/:key`) НЕ содержит `size` и
 * `relativeTransform` — они приходят только с `geometry=paths`. Поэтому по умолчанию
 * геометрия восстанавливается из `rotation` (радианы, CW как у PIXI) и
 * `absoluteBoundingBox`:
 *  - LINE: ось `u = (cos r, sin r)`, нормаль `n = (-sin r, cos r)`,
 *    длина = hypot(bbox.width, bbox.height) (у LINE толщина в bbox не входит);
 *  - прямой VECTOR: bbox вырожден по одной оси (высота или ширина = 0), отрезок
 *    лежит вдоль неё. Обводка VECTOR симметрична, направление для неё не важно,
 *    поэтому поворот не используется.
 * Если `size` и `relativeTransform` переданы, они имеют приоритет и работает
 * алгоритм ТЗ §4.3 дословно.
 *
 * Поведение strokeAlign (проверено по `strokeGeometry` из geometry=paths, ТЗ §4.3 п. 5):
 *  - LINE + CENTER: полоса целиком в диапазоне [-w, 0] по нормали -> сдвиг на -w/2;
 *  - VECTOR + CENTER: полоса симметрична [-w/2, w/2] -> сдвига нет;
 *  - INSIDE / OUTSIDE: пока не проверено, считаем как CENTER и ставим `alignWarning`.
 */

export interface LineBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LineGeometryInput {
  kind: 'LINE' | 'VECTOR';
  /** Bounding box относительно родителя, БЕЗ округления. */
  bounds: LineBounds;
  /** Поворот в радианах из REST (`rotation`); по умолчанию 0. */
  rotation?: number;
  strokeWeight: number;
  strokeAlign?: string;
  /** Точный размер (только с geometry=paths), приоритетнее восстановления. */
  size?: { x: number; y: number };
  /** Матрица `[[a, c, tx], [b, d, ty]]` (только с geometry=paths). */
  relativeTransform?: number[][];
}

export type LineGeometryResult =
  | {
      ok: true;
      x: number;
      y: number;
      length: number;
      /** Градусы по часовой, округление до 0,1. 0 — если поворота нет. */
      angle: number;
      /** strokeAlign не CENTER: линия посчитана как CENTER. */
      alignWarning: boolean;
    }
  | { ok: false; reason: string };

const EPS = 1e-3;

function round(value: number, digits: number): number {
  const k = Math.pow(10, digits);
  const r = Math.round(value * k) / k;
  return r === 0 ? 0 : r; // убираем -0
}

export function computeLineGeometry(input: LineGeometryInput): LineGeometryResult {
  const { kind, bounds, strokeWeight } = input;
  const rotation = input.rotation ?? 0;

  // Ось u и нормаль n
  let u: { x: number; y: number };
  let n: { x: number; y: number };
  let length: number;

  const t = input.relativeTransform;
  if (kind === 'VECTOR') {
    if (input.size && t) {
      const [[a, c], [b, d]] = t;
      if (input.size.x === 0) {
        // Вертикальный VECTOR: ось и нормаль меняются местами
        u = { x: c, y: d };
        n = { x: a, y: b };
        length = input.size.y;
      } else {
        u = { x: a, y: b };
        n = { x: c, y: d };
        length = input.size.x;
      }
    } else if (Math.abs(bounds.height) < EPS) {
      u = { x: 1, y: 0 };
      n = { x: 0, y: 1 };
      length = bounds.width;
    } else if (Math.abs(bounds.width) < EPS) {
      u = { x: 0, y: 1 };
      n = { x: -1, y: 0 };
      length = bounds.height;
    } else {
      return { ok: false, reason: 'VECTOR не прямой горизонтальный или вертикальный отрезок' };
    }
  } else {
    if (t) {
      const [[a, c], [b, d]] = t;
      u = { x: a, y: b };
      n = { x: c, y: d };
    } else {
      u = { x: Math.cos(rotation), y: Math.sin(rotation) };
      n = { x: -Math.sin(rotation), y: Math.cos(rotation) };
    }
    length = input.size ? input.size.x : Math.hypot(bounds.width, bounds.height);
  }

  if (!(length > EPS)) {
    return { ok: false, reason: 'нулевая длина' };
  }

  // Угол
  let angle = round((Math.atan2(u.y, u.x) * 180) / Math.PI, 1);
  if (angle === -180) angle = 180;

  // Начало отрезка: угол bbox, из которого идёт ось
  let x = u.x >= -EPS ? bounds.x : bounds.x + bounds.width;
  let y = u.y >= -EPS ? bounds.y : bounds.y + bounds.height;

  // Сдвиг полосы обводки к оси: только LINE, у VECTOR полоса симметрична
  if (kind === 'LINE') {
    x += n.x * (-strokeWeight / 2);
    y += n.y * (-strokeWeight / 2);
  }

  const align = input.strokeAlign;
  return {
    ok: true,
    x: round(x, 2),
    y: round(y, 2),
    length: round(length, 2),
    angle,
    alignWarning: align !== undefined && align !== 'CENTER'
  };
}
