import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatNumber } from '../src/format.js';
import { factorial } from '../src/functions.js';

test('integers and decimals print plainly', () => {
  assert.equal(formatNumber(14), '14');
  assert.equal(formatNumber(-2.5), '-2.5');
  assert.equal(formatNumber(0.000001), '0.000001');
});

test('floating-point noise is rounded away', () => {
  assert.equal(formatNumber(0.1 + 0.2), '0.3');
  assert.equal(formatNumber(1.2246467991473532e-16 + 1), '1');
});

test('negative zero prints as 0', () => assert.equal(formatNumber(-0), '0'));

test('large and small magnitudes use exponent notation without trailing zeros', () => {
  assert.equal(formatNumber(999999999999), '999999999999');
  assert.equal(formatNumber(1e12), '1e+12');
  assert.equal(formatNumber(-1.5e20), '-1.5e+20');
  assert.equal(formatNumber(2.5e-7), '2.5e-7');
  assert.equal(formatNumber(factorial(20)), '2.43290200818e+18');
});

test('rounding can carry into the next power of ten', () => {
  assert.equal(formatNumber(999999999999.9), '1e+12');
});
