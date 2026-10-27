/** Angle modes for trigonometric input and inverse-trigonometric output. */
export const ANGLE_MODES = Object.freeze({ DEG: 'DEG', RAD: 'RAD' });

/** Named constants. */
export const CONSTANTS = Object.freeze({ pi: Math.PI, e: Math.E });

/** Exact results at multiples of a quarter turn (0°, 90°, 180°, 270°). NaN means "undefined". */
const QUARTER_TURN_VALUES = {
  sin: [0, 1, 0, -1],
  cos: [1, 0, -1, 0],
  tan: [0, NaN, 0, NaN],
};

/** Radian inputs this close (relative) to a non-zero multiple of π/2 snap to the exact value. */
const RAD_SNAP_TOLERANCE = 1e-13;
const RAD_SNAP_MAX_QUARTERS = 1e6;
const LARGEST_FACTORIAL = 170;
const INTEGER_TOLERANCE = 1e-9;

const mod4 = (n) => ((n % 4) + 4) % 4;

/** Trims floating-point noise such as 0.49999999999999994 -> 0.5. */
const clean = (value) => Number(value.toPrecision(15));

/**
 * Returns the quarter-turn index (0-3) when the angle is an exact multiple of 90°, else null.
 * @param {number} x
 * @param {string} angleMode
 * @returns {number|null}
 */
function quarterTurnIndex(x, angleMode) {
  if (angleMode === ANGLE_MODES.DEG) {
    const reduced = x % 360;
    return reduced % 90 === 0 ? mod4(reduced / 90) : null;
  }
  const quarters = x / (Math.PI / 2);
  const nearest = Math.round(quarters);
  const isSnap =
    nearest !== 0 &&
    Math.abs(nearest) <= RAD_SNAP_MAX_QUARTERS &&
    Math.abs(quarters - nearest) <= RAD_SNAP_TOLERANCE * Math.abs(nearest);
  return isSnap ? mod4(nearest) : null;
}

/**
 * sin, cos or tan of an angle in the given mode, exact at quarter turns.
 * @param {'sin'|'cos'|'tan'} name
 * @param {number} x
 * @param {string} angleMode
 * @returns {number}
 */
function trig(name, x, angleMode) {
  const quarter = quarterTurnIndex(x, angleMode);
  if (quarter !== null) return QUARTER_TURN_VALUES[name][quarter];
  const radians = angleMode === ANGLE_MODES.DEG ? ((x % 360) * Math.PI) / 180 : x;
  return clean(Math[name](radians));
}

/**
 * Converts an inverse-trig result (radians) to the requested angle mode.
 * @param {number} radians
 * @param {string} angleMode
 * @returns {number}
 */
function fromRadians(radians, angleMode) {
  return angleMode === ANGLE_MODES.DEG ? clean((radians * 180) / Math.PI) : radians;
}

/** Logarithms are only defined for positive numbers; NaN signals a domain error. */
const positive = (x) => (x > 0 ? x : NaN);

/**
 * Supported functions: name -> (argument, angleMode) => result.
 * A NaN result means a domain error, an infinite result means overflow.
 */
export const FUNCTIONS = Object.freeze({
  sin: (x, mode) => trig('sin', x, mode),
  cos: (x, mode) => trig('cos', x, mode),
  tan: (x, mode) => trig('tan', x, mode),
  asin: (x, mode) => fromRadians(Math.asin(x), mode),
  acos: (x, mode) => fromRadians(Math.acos(x), mode),
  atan: (x, mode) => fromRadians(Math.atan(x), mode),
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  ln: (x) => Math.log(positive(x)),
  log: (x) => Math.log10(positive(x)),
  log2: (x) => Math.log2(positive(x)),
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  abs: Math.abs,
  exp: Math.exp,
  round: (x) => Math.sign(x) * Math.round(Math.abs(x)),
  floor: Math.floor,
  ceil: Math.ceil,
});

/** Names of all supported functions. */
export const FUNCTION_NAMES = Object.freeze(Object.keys(FUNCTIONS));

/**
 * n! for non-negative integers. Returns NaN (domain error) for negative or
 * fractional input and Infinity (overflow) above 170!.
 * @param {number} n
 * @returns {number}
 */
export function factorial(n) {
  const k = Math.round(n);
  if (n < 0 || Math.abs(n - k) > INTEGER_TOLERANCE) return NaN;
  if (k > LARGEST_FACTORIAL) return Infinity;
  let result = 1;
  for (let i = 2; i <= k; i += 1) result *= i;
  return result;
}
