import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeLineGeometry } from './lineGeometry.ts';

const deg = (d: number) => (d * Math.PI) / 180;

function ok(result: ReturnType<typeof computeLineGeometry>) {
  assert.equal(result.ok, true, 'ожидался успешный результат');
  if (!result.ok) throw new Error('unreachable');
  return result;
}

test('горизонтальный LINE 0°: сдвиг полосы на -w/2 по нормали', () => {
  // «Line 3» в SettingsPopup: bbox height 0, толщина 3, полоса [-3, 0] относительно bbox
  const r = ok(computeLineGeometry({
    kind: 'LINE',
    bounds: { x: 10, y: 100, width: 270, height: 0 },
    strokeWeight: 3,
    strokeAlign: 'CENTER'
  }));
  assert.deepEqual(
    { x: r.x, y: r.y, length: r.length, angle: r.angle, alignWarning: r.alignWarning },
    { x: 10, y: 98.5, length: 270, angle: 0, alignWarning: false }
  );
});

test('LINE 180°: начало на правом конце bbox, сдвиг по нормали в другую сторону', () => {
  const r = ok(computeLineGeometry({
    kind: 'LINE',
    bounds: { x: 10, y: 100, width: 270, height: 0 },
    rotation: Math.PI,
    strokeWeight: 3
  }));
  assert.equal(r.angle, 180);
  assert.equal(r.length, 270);
  assert.equal(r.x, 280);
  assert.equal(r.y, 101.5);
});

test('LINE 180° с rotation = -π тоже даёт угол 180', () => {
  const r = ok(computeLineGeometry({
    kind: 'LINE',
    bounds: { x: 0, y: 0, width: 50, height: 0 },
    rotation: -Math.PI,
    strokeWeight: 2
  }));
  assert.equal(r.angle, 180);
  assert.equal(r.x, 50);
});

test('LINE 30°: длина из гипотенузы bbox, нормаль (-sin, cos)', () => {
  const L = 100;
  const r = ok(computeLineGeometry({
    kind: 'LINE',
    bounds: { x: 10, y: 20, width: L * Math.cos(deg(30)), height: L * Math.sin(deg(30)) },
    rotation: deg(30),
    strokeWeight: 4
  }));
  assert.equal(r.angle, 30);
  assert.equal(r.length, 100);
  // start = (10, 20) + n * (-2), n = (-0.5, 0.866)
  assert.equal(r.x, 11);
  assert.equal(r.y, round2(20 - 2 * Math.cos(deg(30))));
});

test('LINE 135°: ось смотрит влево-вниз, начало в правом верхнем углу bbox', () => {
  const L = 100;
  const w = L * Math.cos(deg(45));
  const r = ok(computeLineGeometry({
    kind: 'LINE',
    bounds: { x: 10, y: 20, width: w, height: w },
    rotation: deg(135),
    strokeWeight: 2
  }));
  assert.equal(r.angle, 135);
  assert.equal(r.length, 100);
  // start = (10 + w, 20); n = (-sin135, cos135) = (-0.7071, -0.7071); shift = n * (-1)
  assert.equal(r.x, round2(10 + w + Math.SQRT1_2));
  assert.equal(r.y, round2(20 + Math.SQRT1_2));
});

test('вертикальный LINE -90° (вверх): начало внизу bbox', () => {
  const r = ok(computeLineGeometry({
    kind: 'LINE',
    bounds: { x: 50, y: 10, width: 0, height: 80 },
    rotation: -Math.PI / 2,
    strokeWeight: 2
  }));
  assert.equal(r.angle, -90);
  assert.equal(r.length, 80);
  assert.equal(r.y, 90);
  // n = (1, 0) -> сдвиг на -1 по x
  assert.equal(r.x, 49);
});

test('горизонтальный VECTOR: без сдвига полосы', () => {
  // «Line 3» в AutoplaySettingsPopup: bbox height 0, толщина 3
  const r = ok(computeLineGeometry({
    kind: 'VECTOR',
    bounds: { x: 20, y: 187.5, width: 385, height: 0 },
    strokeWeight: 3,
    strokeAlign: 'CENTER'
  }));
  assert.deepEqual([r.x, r.y, r.length, r.angle], [20, 187.5, 385, 0]);
});

test('вертикальный VECTOR (ширина bbox = 0): угол 90°, без сдвига', () => {
  const r = ok(computeLineGeometry({
    kind: 'VECTOR',
    bounds: { x: 33.25, y: 5, width: 0, height: 120 },
    strokeWeight: 3
  }));
  assert.deepEqual([r.x, r.y, r.length, r.angle], [33.25, 5, 120, 90]);
});

test('VECTOR с size/relativeTransform: size.x === 0 меняет ось и нормаль местами', () => {
  const r = ok(computeLineGeometry({
    kind: 'VECTOR',
    bounds: { x: 7, y: 9, width: 0, height: 40 },
    size: { x: 0, y: 40 },
    relativeTransform: [[1, 0, 7], [0, 1, 9]],
    strokeWeight: 2
  }));
  assert.deepEqual([r.x, r.y, r.length, r.angle], [7, 9, 40, 90]);
});

test('LINE с size/relativeTransform имеет приоритет над rotation', () => {
  const r = ok(computeLineGeometry({
    kind: 'LINE',
    bounds: { x: 0, y: 10, width: 600, height: 0 },
    size: { x: 600, y: 0 },
    relativeTransform: [[1, 0, 0], [0, 1, 10]],
    strokeWeight: 2
  }));
  // Путь обводки из ТЗ: M0 -1 ... -> полоса [-2, 0], центр y = 10 - 1
  assert.deepEqual([r.x, r.y, r.length, r.angle], [0, 9, 600, 0]);
});

test('дробные координаты округляются до 2 знаков, а не до целых', () => {
  const r = ok(computeLineGeometry({
    kind: 'VECTOR',
    bounds: { x: 0.123456, y: 107.5, width: 10.98765, height: 0 },
    strokeWeight: 3
  }));
  assert.deepEqual([r.x, r.y, r.length], [0.12, 107.5, 10.99]);
});

test('strokeAlign не CENTER: считается как CENTER и помечается alignWarning', () => {
  const r = ok(computeLineGeometry({
    kind: 'LINE',
    bounds: { x: 0, y: 10, width: 100, height: 0 },
    strokeWeight: 2,
    strokeAlign: 'INSIDE'
  }));
  assert.equal(r.alignWarning, true);
  assert.equal(r.y, 9);
});

test('нулевая длина -> ok: false с причиной', () => {
  const line = computeLineGeometry({
    kind: 'LINE',
    bounds: { x: 0, y: 0, width: 0, height: 0 },
    strokeWeight: 2
  });
  assert.equal(line.ok, false);
  const vec = computeLineGeometry({
    kind: 'VECTOR',
    bounds: { x: 0, y: 0, width: 0, height: 0 },
    strokeWeight: 2
  });
  assert.equal(vec.ok, false);
});

test('диагональный VECTOR без size/transform отклоняется', () => {
  const r = computeLineGeometry({
    kind: 'VECTOR',
    bounds: { x: 0, y: 0, width: 50, height: 50 },
    strokeWeight: 2
  });
  assert.equal(r.ok, false);
});

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
