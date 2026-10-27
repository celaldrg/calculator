/** Significant digits shown on the display. */
export const DISPLAY_DIGITS = 12;

const LARGE = 1e12;
const SMALL = 1e-6;

/**
 * Exponent notation without trailing zeros: 1.5e+15, 1e-7.
 * @param {number} value
 * @returns {string}
 */
function toExponent(value) {
  const [mantissa, exponent] = value.toExponential(DISPLAY_DIGITS - 1).split('e');
  const trimmed = mantissa.replace(/\.?0+$/, '');
  return `${trimmed}e${exponent}`;
}

/**
 * Formats a finite number for the display: rounded to 12 significant digits
 * (so 0.1+0.2 shows 0.3), exponent notation for very large or very small
 * values. The output can be typed back into the calculator.
 * @param {number} value Finite number.
 * @returns {string}
 */
export function formatNumber(value) {
  const rounded = Number(value.toPrecision(DISPLAY_DIGITS));
  if (rounded === 0) return '0';
  const magnitude = Math.abs(rounded);
  if (magnitude >= LARGE || magnitude < SMALL) return toExponent(rounded);
  return String(rounded);
}
