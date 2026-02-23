/**
 * @fileoverview Mixed value sentinel and helper for abstracting figma.mixed
 */

/**
 * Sentinel value replacing figma.mixed.
 * Plugin adapter: set when property === figma.mixed
 * REST adapter: never produced (REST API resolves values)
 */
export const MIXED_VALUE: unique symbol = Symbol('MIXED_VALUE');
export type MixedValue = typeof MIXED_VALUE;

/**
 * Check if a value is mixed (replaces all `=== figma.mixed` checks)
 */
export function isMixed(value: any): value is MixedValue {
  return value === MIXED_VALUE;
}
