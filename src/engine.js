import { CalcError } from './errors.js';
import { evaluate } from './evaluator.js';
import { formatNumber } from './format.js';
import { ANGLE_MODES } from './functions.js';
import { parse } from './parser.js';
import { tokenize } from './tokenizer.js';

/**
 * @typedef {{code: string, pos?: number, name?: string}} CalcFailure
 * @typedef {{ok: true, value: number, display: string} | {ok: false, error: CalcFailure}} CalcResult
 */

/**
 * Parses and evaluates an expression. Never uses eval or the Function constructor.
 * @param {string} expression e.g. "sin(30)+√(16)×2^3"
 * @param {{angleMode?: string, ans?: number}} [options] Angle mode (DEG default) and the value of Ans.
 * @returns {CalcResult} The value plus its display string, or an error code
 *   (divisionByZero, syntax with pos, unknownFunction with pos and name, domain, overflow).
 */
export function calculate(expression, { angleMode = ANGLE_MODES.DEG, ans = 0 } = {}) {
  try {
    const tree = parse(tokenize(expression), expression.length);
    const value = evaluate(tree, { angleMode, ans });
    return { ok: true, value, display: formatNumber(value) };
  } catch (error) {
    if (error instanceof CalcError) return { ok: false, error: { code: error.code, ...error.details } };
    throw error;
  }
}
