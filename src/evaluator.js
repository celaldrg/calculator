import { CalcError, ERROR } from './errors.js';
import { CONSTANTS, FUNCTIONS, factorial } from './functions.js';

/**
 * @typedef {import('./parser.js').Node} Node
 * @typedef {{angleMode: string, ans: number}} EvalContext
 */

/** Binary operators. Division and powers of zero check for division by zero first. */
const BINARY = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '*': (a, b) => a * b,
  '/': (a, b) => {
    if (b === 0) throw new CalcError(ERROR.DIVISION_BY_ZERO);
    return a / b;
  },
  '^': (a, b) => {
    if (a === 0 && b < 0) throw new CalcError(ERROR.DIVISION_BY_ZERO);
    return a ** b;
  },
};

const POSTFIX = {
  '!': factorial,
  '%': (x) => x / 100,
};

/** Node type -> (node, context) => raw value (not yet checked). */
const NODE_EVALUATORS = {
  num: (node) => node.value,
  const: (node) => CONSTANTS[node.name],
  ans: (node, context) => context.ans,
  neg: (node, context) => -evaluate(node.arg, context),
  binary: (node, context) =>
    BINARY[node.op](evaluate(node.left, context), evaluate(node.right, context)),
  postfix: (node, context) => POSTFIX[node.op](evaluate(node.arg, context)),
  call: (node, context) => FUNCTIONS[node.name](evaluate(node.arg, context), context.angleMode),
};

/**
 * Evaluates a syntax tree. Every intermediate result is checked: NaN is a
 * domain error, an infinite value is an overflow.
 * @param {Node} node
 * @param {EvalContext} context
 * @returns {number} A finite number.
 * @throws {CalcError} divisionByZero, domain or overflow.
 */
export function evaluate(node, context) {
  const value = NODE_EVALUATORS[node.type](node, context);
  if (Number.isNaN(value)) throw new CalcError(ERROR.DOMAIN);
  if (!Number.isFinite(value)) throw new CalcError(ERROR.OVERFLOW);
  return value;
}
