import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize } from '../src/tokenizer.js';
import { parse } from '../src/parser.js';
import { CalcError, ERROR } from '../src/errors.js';
import { FUNCTION_NAMES } from '../src/functions.js';

const kinds = (input) => tokenize(input).map((token) => token.name ?? token.op ?? token.value ?? token.type);

test('numbers, operators and parentheses with positions', () => {
  assert.deepEqual(tokenize('2×(3−1)'), [
    { type: 'num', value: 2, pos: 0 },
    { type: 'op', op: '*', pos: 1 },
    { type: 'lparen', pos: 2 },
    { type: 'num', value: 3, pos: 3 },
    { type: 'op', op: '-', pos: 4 },
    { type: 'num', value: 1, pos: 5 },
    { type: 'rparen', pos: 6 },
  ]);
});

test('√ and π are a function and a constant', () => {
  assert.deepEqual(kinds('√π'), ['sqrt', 'pi']);
});

test('letter runs split into known names', () => {
  assert.deepEqual(kinds('sinpi'), ['sin', 'pi']);
  assert.deepEqual(kinds('2epi'), [2, 'e', 'pi']);
  assert.deepEqual(kinds('cosh(0)'), ['cosh', 'lparen', 0, 'rparen']);
});

test('log2 is one name, but log28 is log of 28', () => {
  assert.deepEqual(kinds('log2(8)'), ['log2', 'lparen', 8, 'rparen']);
  assert.deepEqual(kinds('log28'), ['log', 28]);
});

test('e is the constant unless it forms exponent notation', () => {
  assert.deepEqual(kinds('2e3'), [2000]);
  assert.deepEqual(kinds('2e'), [2, 'e']);
  assert.deepEqual(kinds('2e+'), [2, 'e', '+']);
  assert.deepEqual(kinds('1exp(1)'), [1, 'exp', 'lparen', 1, 'rparen']);
});

test('Ans in any case', () => {
  assert.deepEqual(kinds('Ans+ANS'), ['ans', '+', 'ans']);
});

test('unknown names throw with position and the original spelling', () => {
  assert.throws(
    () => tokenize('2+Foo'),
    (error) => error instanceof CalcError && error.code === ERROR.UNKNOWN_FUNCTION && error.details.pos === 2 && error.details.name === 'Foo',
  );
});

test('every supported function name tokenizes as a function', () => {
  for (const name of FUNCTION_NAMES) {
    assert.deepEqual(tokenize(`${name}(1)`)[0], { type: 'func', name, pos: 0 }, name);
  }
});

test('parser builds a right-associative power tree', () => {
  assert.deepEqual(parse(tokenize('2^3^2'), 5), {
    type: 'binary',
    op: '^',
    left: { type: 'num', value: 2 },
    right: { type: 'binary', op: '^', left: { type: 'num', value: 3 }, right: { type: 'num', value: 2 } },
  });
});
