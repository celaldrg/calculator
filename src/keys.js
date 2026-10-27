/** Keyboard keys that run a command. */
const COMMAND_KEYS = new Map([
  ['Enter', 'evaluate'],
  ['=', 'evaluate'],
  ['Backspace', 'backspace'],
  ['Escape', 'clear'],
  ['Delete', 'clear'],
]);

/** Keys inserted as a different (display) character. "," is the decimal key on Turkish keypads. */
const TRANSLATED_KEYS = new Map([
  ['*', '×'],
  ['/', '÷'],
  ['-', '−'],
  [',', '.'],
]);

/** Keys inserted as typed: digits, operators, parentheses and letters for function names. */
const LITERAL_KEY = /^[0-9.+^!%()a-z]$/i;

/**
 * Maps a KeyboardEvent.key value to a calculator action (see createCalculator().dispatch).
 * The caller should ignore events with Ctrl, Meta or Alt held.
 * @param {string} key
 * @returns {import('./calculator.js').CalculatorAction|null} null when the key is not used.
 */
export function keyToAction(key) {
  const command = COMMAND_KEYS.get(key);
  if (command) return { type: command };
  const translated = TRANSLATED_KEYS.get(key);
  if (translated) return { type: 'insert', text: translated };
  return LITERAL_KEY.test(key) ? { type: 'insert', text: key } : null;
}
