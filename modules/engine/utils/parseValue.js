/**
 * Parse a value expression into pixels.
 *
 * Supported formats:
 *   100     → 100 (number passthrough)
 *   "50%"   → basisSize * 0.5
 *   "100px" → 100
 *   "120"   → 120
 *
 * @param {number|string} value - The value expression
 * @param {number} basisSize - The reference size for percentage calculations
 * @returns {number} Computed pixel value
 */
export function parseValue(value, basisSize) {
    if (typeof value === "number") {
        return value;
    }

    if (typeof value === "string") {
        const match = value.match(/^([+-]?\d+(?:\.\d+)?)(%|px)?$/);
        if (!match) {
            return 0;
        }

        const [, number, unit] = match;
        const numValue = parseFloat(number);

        if (unit === "%") {
            return (basisSize * numValue) / 100;
        }

        return numValue;
    }

    return 0;
}
