import { CalcError, ERROR } from './errors.js';
import { FUNCTION_NAMES } from './functions.js';

/**
 * @typedef {object} Token
 * @property {'num'|'op'|'postfix'|'lparen'|'rparen'|'func'|'const'|'ans'} type
 * @property {number} pos Index of the first character in the input.
 * @property {number} [value] Numeric value (type 'num').
 * @property {string} [op] Operator: + - * / ^ (type 'op') or ! % (type 'postfix').
 * @property {string} [name] Lower-case name (types 'func' and 'const').
 */

/** Lower-case name -> token type. */
const NAMES = new Map([
  ...FUNCTION_NAMES.map((name) => [name, 'func']),
  ['pi', 'const'],
  ['e', 'const'],
  ['ans', 'ans'],
]);

/** Single-character symbols, including the typographic × ÷ − √ π. */
const SYMBOLS = new Map([
  ['+', { type: 'op', op: '+' }],
  ['-', { type: 'op', op: '-' }],
  ['−', { type: 'op', op: '-' }],
  ['*', { type: 'op', op: '*' }],
  ['×', { type: 'op', op: '*' }],
  ['/', { type: 'op', op: '/' }],
  ['÷', { type: 'op', op: '/' }],
  ['^', { type: 'op', op: '^' }],
  ['!', { type: 'postfix', op: '!' }],
  ['%', { type: 'postfix', op: '%' }],
  ['(', { type: 'lparen' }],
  [')', { type: 'rparen' }],
  ['√', { type: 'func', name: 'sqrt' }],
  ['π', { type: 'const', name: 'pi' }],
]);

const NUMBER_RE = /(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;
const LETTERS_RE = /[A-Za-z]+/y;
const DIGITS_RE = /\d+/y;
const WHITESPACE_RE = /\s/;

/**
 * Matches a sticky regular expression at a given index.
 * @param {RegExp} re Sticky (y) regular expression.
 * @param {string} input
 * @param {number} index
 * @returns {string|null}
 */
function matchAt(re, input, index) {
  re.lastIndex = index;
  const match = re.exec(input);
  return match ? match[0] : null;
}

/**
 * Longest known name that starts at `index` of the lower-case letter run.
 * @param {string} run
 * @param {number} index
 * @returns {string|null}
 */
function longestNameAt(run, index) {
  let best = null;
  for (const name of NAMES.keys()) {
    if (run.startsWith(name, index) && (!best || name.length > best.length)) best = name;
  }
  return best;
}

/**
 * Splits a run of letters into known names, so "2pi" and "sinpi" work.
 * @param {string} letters Original letters as typed.
 * @param {number} start Position of the run in the input.
 * @returns {{name: string, pos: number}[]}
 */
function splitNames(letters, start) {
  const run = letters.toLowerCase();
  const pieces = [];
  let index = 0;
  while (index < run.length) {
    const name = longestNameAt(run, index);
    if (!name) {
      throw new CalcError(ERROR.UNKNOWN_FUNCTION, { pos: start + index, name: letters.slice(index) });
    }
    pieces.push({ name, pos: start + index });
    index += name.length;
  }
  return pieces;
}

/**
 * Pushes the name tokens for the letter run at `start` and returns the index after it.
 * Trailing digits join the last name only when that forms a known name ("log2").
 * @param {Token[]} tokens
 * @param {string} input
 * @param {number} start
 * @param {string} letters
 * @returns {number}
 */
function pushNames(tokens, input, start, letters) {
  const pieces = splitNames(letters, start);
  let end = start + letters.length;
  const digits = matchAt(DIGITS_RE, input, end);
  const last = pieces[pieces.length - 1];
  if (digits && NAMES.has(last.name + digits)) {
    last.name += digits;
    end += digits.length;
  }
  for (const { name, pos } of pieces) tokens.push({ type: NAMES.get(name), name, pos });
  return end;
}

/**
 * Turns an expression string into tokens.
 * @param {string} input
 * @returns {Token[]}
 * @throws {CalcError} syntax (unexpected character) or unknownFunction.
 */
export function tokenize(input) {
  const tokens = [];
  let index = 0;
  while (index < input.length) {
    const char = input[index];
    if (WHITESPACE_RE.test(char)) {
      index += 1;
      continue;
    }
    const number = matchAt(NUMBER_RE, input, index);
    if (number) {
      tokens.push({ type: 'num', value: Number(number), pos: index });
      index += number.length;
      continue;
    }
    const letters = matchAt(LETTERS_RE, input, index);
    if (letters) {
      index = pushNames(tokens, input, index, letters);
      continue;
    }
    const symbol = SYMBOLS.get(char);
    if (!symbol) throw new CalcError(ERROR.SYNTAX, { pos: index });
    tokens.push({ ...symbol, pos: index });
    index += 1;
  }
  return tokens;
}
