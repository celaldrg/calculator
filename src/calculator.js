import { calculate } from './engine.js';
import { ANGLE_MODES, FUNCTION_NAMES } from './functions.js';
import { addEntry, sanitizeHistory } from './history.js';

/** Expression shown by the ?demo state (README screenshot). */
export const DEMO_EXPRESSION = 'sin(30)+√(16)×2^3';

/** Earlier calculations listed in the ?demo history, oldest first. */
const DEMO_HISTORY = ['2+3×4', '(1+2)^2', '5!', '√(2)'];

/** Text that continues the previous result when typed right after "=". */
const CONTINUES_RESULT = /^[+\-−*×/÷^!%]/;

/** Units removed by one backspace: "sin(", "log2(", "√(", "Ans", "pi". */
const TRAILING_UNIT = new RegExp(`(?:(?:${FUNCTION_NAMES.join('|')}|√)\\(|ans|pi)$`, 'i');

/**
 * @typedef {import('./history.js').HistoryEntry} HistoryEntry
 * @typedef {import('./engine.js').CalcFailure} CalcFailure
 * @typedef {object} CalculatorState
 * @property {string} expression What the user typed.
 * @property {string} preview Live result while typing ('' when incomplete or invalid).
 * @property {string} result Display string of the last evaluation ('' if none).
 * @property {CalcFailure|null} error Error code of the last failed evaluation.
 * @property {'DEG'|'RAD'} angleMode
 * @property {number} ans Value of Ans (last successful result).
 * @property {HistoryEntry[]} history Newest first, at most 50.
 * @property {boolean} evaluated True right after a successful "=".
 * @typedef {{type: 'insert', text: string} | {type: 'evaluate'|'backspace'|'clear'|'toggleAngle'}} CalculatorAction
 */

/**
 * Removes the last typed unit (a whole function name with its "(", or one character).
 * @param {string} expression
 * @returns {string}
 */
function removeLastUnit(expression) {
  const match = TRAILING_UNIT.exec(expression);
  return match ? expression.slice(0, match.index) : expression.slice(0, -1);
}

/**
 * Creates a calculator state machine for the UI to drive. Pure: no DOM or storage access.
 * @param {{angleMode?: string, history?: unknown, ans?: number}} [options] Saved angle mode,
 *   history (sanitised) and Ans.
 */
export function createCalculator({ angleMode = ANGLE_MODES.DEG, history = [], ans = 0 } = {}) {
  /** @type {CalculatorState} */
  const state = {
    expression: '',
    preview: '',
    result: '',
    error: null,
    angleMode: angleMode === ANGLE_MODES.RAD ? ANGLE_MODES.RAD : ANGLE_MODES.DEG,
    ans: Number.isFinite(ans) ? ans : 0,
    history: sanitizeHistory(history),
    evaluated: false,
  };

  function refreshPreview() {
    const outcome = state.expression.trim() ? calculate(state.expression, state) : null;
    state.preview = outcome?.ok ? outcome.display : '';
  }

  function setExpression(expression) {
    state.expression = expression;
    state.result = '';
    state.error = null;
    state.evaluated = false;
    refreshPreview();
  }

  /** @returns {CalculatorState} A copy safe to read and keep. */
  function getState() {
    return {
      ...state,
      error: state.error && { ...state.error },
      history: state.history.map((entry) => ({ ...entry })),
    };
  }

  /**
   * Appends text. Right after "=", an operator continues from Ans and anything else starts over.
   * @param {string} text
   */
  function insert(text) {
    if (!state.evaluated) setExpression(state.expression + text);
    else setExpression((CONTINUES_RESULT.test(text) ? 'Ans' : '') + text);
  }

  function backspace() {
    setExpression(removeLastUnit(state.expression));
  }

  /** AC: clears the expression and result; keeps Ans, history and angle mode. */
  function clear() {
    setExpression('');
  }

  /** "=": evaluates the expression, stores Ans and adds a history entry, or records the error. */
  function evaluate() {
    if (state.evaluated || !state.expression.trim()) return;
    const outcome = calculate(state.expression, state);
    state.preview = '';
    if (!outcome.ok) {
      state.error = outcome.error;
      state.result = '';
      return;
    }
    state.result = outcome.display;
    state.ans = outcome.value;
    state.error = null;
    state.evaluated = true;
    state.history = addEntry(state.history, { expression: state.expression, result: outcome.display });
  }

  function toggleAngle() {
    state.angleMode = state.angleMode === ANGLE_MODES.DEG ? ANGLE_MODES.RAD : ANGLE_MODES.DEG;
    if (!state.evaluated) refreshPreview();
  }

  /**
   * Loads a history entry's expression for editing.
   * @param {number} index 0 = newest.
   */
  function useHistory(index) {
    const entry = state.history[index];
    if (entry) setExpression(entry.expression);
  }

  function clearHistory() {
    state.history = [];
  }

  /**
   * Runs an action, e.g. one produced by keyToAction() or a keypad button.
   * @param {CalculatorAction} action
   */
  function dispatch(action) {
    const handlers = { insert: () => insert(action.text), evaluate, backspace, clear, toggleAngle };
    handlers[action.type]?.();
  }

  return { getState, insert, backspace, clear, evaluate, toggleAngle, useHistory, clearHistory, dispatch };
}

/**
 * Deterministic demo state for the README screenshot: DEMO_EXPRESSION evaluated
 * (32.5, DEG mode) with a few earlier calculations in the history.
 * @returns {ReturnType<typeof createCalculator>}
 */
export function createDemoCalculator() {
  const calculator = createCalculator({ angleMode: ANGLE_MODES.DEG });
  for (const expression of [...DEMO_HISTORY, DEMO_EXPRESSION]) {
    calculator.insert(expression);
    calculator.evaluate();
  }
  return calculator;
}
