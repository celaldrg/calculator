/**
 * Keypad layout as plain data (no DOM), so the tests can check every key.
 * Key labels are math notation and look the same in every language; keys
 * whose label is only a symbol get a translated accessible name (ariaKey).
 */

/**
 * @typedef {import('./calculator.js').CalculatorAction} CalculatorAction
 * @typedef {object} KeyDef
 * @property {string} label Text printed on the key.
 * @property {CalculatorAction} action What pressing the key does.
 * @property {'digit'|'op'|'fn'|'command'|'equals'} kind Visual style.
 * @property {string} [ariaKey] i18n key of the accessible name.
 */

/**
 * @param {string} label
 * @param {string} [text] Inserted text when it differs from the label.
 * @param {KeyDef['kind']} [kind]
 * @returns {KeyDef}
 */
const insertKey = (label, text = label, kind = 'op') => ({ label, kind, action: { type: 'insert', text } });

/** @param {string} digit */
const digitKey = (digit) => insertKey(digit, digit, 'digit');

/**
 * A function key inserts its name and an opening parenthesis: sin -> "sin(".
 * @param {string} name
 * @param {string} [label]
 */
const functionKey = (name, label = name) => insertKey(label, `${name}(`, 'fn');

/**
 * @param {string} label
 * @param {'evaluate'|'backspace'|'clear'} type
 * @param {string} ariaKey
 * @param {KeyDef['kind']} [kind]
 * @returns {KeyDef}
 */
const commandKey = (label, type, ariaKey, kind = 'command') => ({ label, kind, ariaKey, action: { type } });

/** Main keypad, 5 columns x 5 rows, row by row. */
export const MAIN_KEYS = Object.freeze([
  commandKey('AC', 'clear', 'key.clear'),
  insertKey('('),
  insertKey(')'),
  insertKey('%'),
  commandKey('⌫', 'backspace', 'key.backspace'),
  digitKey('7'),
  digitKey('8'),
  digitKey('9'),
  insertKey('÷'),
  insertKey('xʸ', '^'),
  digitKey('4'),
  digitKey('5'),
  digitKey('6'),
  insertKey('×'),
  insertKey('√', '√('),
  digitKey('1'),
  digitKey('2'),
  digitKey('3'),
  insertKey('−'),
  insertKey('π'),
  digitKey('0'),
  digitKey('.'),
  { ...insertKey('Ans'), ariaKey: 'key.ans' },
  insertKey('+'),
  commandKey('=', 'evaluate', 'key.equals', 'equals'),
]);

/**
 * Scientific keys in groups of five: each group is a row on narrow screens
 * (5 columns) and a column on wide screens (5 rows, filled column by column).
 */
export const SCIENCE_KEYS = Object.freeze([
  functionKey('sin'),
  functionKey('cos'),
  functionKey('tan'),
  functionKey('ln'),
  functionKey('log'),
  functionKey('asin', 'sin⁻¹'),
  functionKey('acos', 'cos⁻¹'),
  functionKey('atan', 'tan⁻¹'),
  functionKey('log2', 'log₂'),
  functionKey('exp', 'eˣ'),
  functionKey('sinh'),
  functionKey('cosh'),
  functionKey('tanh'),
  functionKey('cbrt', '³√'),
  functionKey('abs', '|x|'),
  functionKey('round'),
  functionKey('floor'),
  functionKey('ceil'),
  insertKey('e', 'e', 'fn'),
  insertKey('n!', '!', 'fn'),
]);

/**
 * Finds the on-screen key that performs an action, e.g. to flash it when the
 * same action comes from the physical keyboard.
 * @param {CalculatorAction} action
 * @returns {KeyDef|undefined}
 */
export function findKey(action) {
  return [...MAIN_KEYS, ...SCIENCE_KEYS].find(
    (key) => key.action.type === action.type && key.action.text === action.text,
  );
}
