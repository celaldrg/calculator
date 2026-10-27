import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculate } from '../src/engine.js';
import { ERROR } from '../src/errors.js';

const DEG = { angleMode: 'DEG' };
const RAD = { angleMode: 'RAD' };

/** Evaluates and asserts success; returns the numeric value. */
function valueOf(expression, options) {
  const outcome = calculate(expression, options);
  assert.equal(outcome.ok, true, `${expression} failed: ${JSON.stringify(outcome.error)}`);
  return outcome.value;
}

/** Evaluates and asserts success; returns the display string. */
function displayOf(expression, options) {
  const outcome = calculate(expression, options);
  assert.equal(outcome.ok, true, `${expression} failed: ${JSON.stringify(outcome.error)}`);
  return outcome.display;
}

/** Evaluates and asserts failure; returns the error object. */
function errorOf(expression, options) {
  const outcome = calculate(expression, options);
  assert.equal(outcome.ok, false, `${expression} should fail but gave ${outcome.value}`);
  return outcome.error;
}

const approx = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} is not close to ${expected}`);

describe('DONE criterion', () => {
  test('2+3*4 = 14', () => assert.equal(valueOf('2+3*4'), 14));
  test('(1+2)^2 = 9', () => assert.equal(valueOf('(1+2)^2'), 9));
  test('sin(30) = 0.5 in DEG mode', () => {
    assert.equal(valueOf('sin(30)', DEG), 0.5);
    assert.equal(displayOf('sin(30)', DEG), '0.5');
  });
  test('1/0 returns a division-by-zero error', () => {
    assert.deepEqual(calculate('1/0'), { ok: false, error: { code: ERROR.DIVISION_BY_ZERO } });
  });
});

describe('operators and precedence', () => {
  test('^ is right-associative: 2^3^2 = 512', () => assert.equal(valueOf('2^3^2'), 512));
  test('unary minus binds looser than ^: -2^2 = -4', () => assert.equal(valueOf('-2^2'), -4));
  test('(-2)^2 = 4 and 2^-1 = 0.5', () => {
    assert.equal(valueOf('(-2)^2'), 4);
    assert.equal(valueOf('2^-1'), 0.5);
  });
  test('left-associative - and /', () => {
    assert.equal(valueOf('10-4-3'), 3);
    assert.equal(valueOf('100/10/5'), 2);
  });
  test('repeated signs', () => {
    assert.equal(valueOf('2--2'), 4);
    assert.equal(valueOf('2*-3'), -6);
    assert.equal(valueOf('+5'), 5);
  });
  test('typographic symbols × ÷ −', () => {
    assert.equal(valueOf('6×7'), 42);
    assert.equal(valueOf('8÷2'), 4);
    assert.equal(valueOf('9−5'), 4);
    assert.equal(valueOf('−3×−3'), 9);
  });
  test('whitespace is ignored', () => assert.equal(valueOf(' 2 +  3 * 4 '), 14));
});

describe('numbers', () => {
  test('decimals', () => {
    assert.equal(valueOf('.5+3.'), 3.5);
    assert.equal(valueOf('1.25*4'), 5);
  });
  test('exponent notation', () => {
    assert.equal(valueOf('1e3'), 1000);
    assert.equal(valueOf('2.5e-3'), 0.0025);
    assert.equal(valueOf('1E2'), 100);
    assert.equal(valueOf('1e+2'), 100);
  });
});

describe('postfix operators', () => {
  test('factorial', () => {
    assert.equal(valueOf('5!'), 120);
    assert.equal(valueOf('0!'), 1);
    assert.equal(valueOf('3!^2'), 36);
    assert.equal(valueOf('2^3!'), 64);
    assert.equal(valueOf('-3!'), -6);
    assert.equal(valueOf('3!!'), 720);
  });
  test('factorial accepts float noise around integers', () => assert.equal(valueOf('((0.1+0.2)*10)!'), 6));
  test('factorial of negative or fractional numbers is a domain error', () => {
    assert.equal(errorOf('(-1)!').code, ERROR.DOMAIN);
    assert.equal(errorOf('2.5!').code, ERROR.DOMAIN);
  });
  test('171! overflows', () => assert.equal(errorOf('171!').code, ERROR.OVERFLOW));
  test('percent divides by 100', () => {
    assert.equal(valueOf('50%'), 0.5);
    assert.equal(valueOf('200*10%'), 20);
    assert.equal(valueOf('10%%'), 0.001);
  });
});

describe('constants and implicit multiplication', () => {
  test('π, pi and e', () => {
    assert.equal(valueOf('π'), Math.PI);
    assert.equal(valueOf('pi'), Math.PI);
    assert.equal(valueOf('PI'), Math.PI);
    assert.equal(valueOf('e'), Math.E);
  });
  test('2π', () => assert.equal(valueOf('2π'), 2 * Math.PI));
  test('2(3) = 6', () => assert.equal(valueOf('2(3)'), 6));
  test('(1+2)(3+4) = 21', () => assert.equal(valueOf('(1+2)(3+4)'), 21));
  test('3sin(30) = 1.5 in DEG', () => assert.equal(valueOf('3sin(30)', DEG), 1.5));
  test('more implicit products', () => {
    assert.equal(valueOf('(2)3'), 6);
    assert.equal(valueOf('2√(9)'), 6);
    assert.equal(valueOf('2pi'), 2 * Math.PI);
    assert.equal(valueOf('π2'), 2 * Math.PI);
    assert.equal(valueOf('2e'), 2 * Math.E);
    assert.equal(valueOf('2(3)^2'), 18);
    assert.equal(valueOf('4!2'), 48);
  });
  test('implicit product has the same precedence as ×: 1/2π = π/2', () =>
    assert.equal(valueOf('1/2π'), Math.PI / 2));
  test('two plain numbers in a row are a syntax error', () =>
    assert.deepEqual(errorOf('2 3'), { code: ERROR.SYNTAX, pos: 2 }));
});

describe('parentheses', () => {
  test('missing closing parentheses are auto-closed', () => {
    assert.equal(valueOf('(1+2'), 3);
    assert.equal(valueOf('sqrt(16'), 4);
    assert.equal(valueOf('2×(3+(4'), 14);
    assert.equal(valueOf('sin(30', DEG), 0.5);
  });
  test('nested groups', () => assert.equal(valueOf('((2+3)×(4−1))^2'), 225));
});

describe('functions', () => {
  test('logarithms', () => {
    assert.equal(valueOf('log(1000)'), 3);
    assert.equal(valueOf('log2(8)'), 3);
    assert.equal(valueOf('ln(e)'), 1);
    assert.equal(valueOf('log28'), Math.log10(28));
  });
  test('roots', () => {
    assert.equal(valueOf('sqrt(16)'), 4);
    assert.equal(valueOf('√16'), 4);
    assert.equal(valueOf('√(16)×2'), 8);
    assert.equal(valueOf('cbrt(-27)'), -3);
  });
  test('abs, exp and rounding', () => {
    assert.equal(valueOf('abs(-5)'), 5);
    assert.equal(valueOf('exp(0)'), 1);
    assert.equal(valueOf('round(2.5)'), 3);
    assert.equal(valueOf('round(-2.5)'), -3);
    assert.equal(valueOf('floor(-1.5)'), -2);
    assert.equal(valueOf('ceil(1.2)'), 2);
  });
  test('hyperbolic functions ignore the angle mode', () => {
    assert.equal(valueOf('sinh(0)', DEG), 0);
    assert.equal(valueOf('cosh(0)', DEG), 1);
    assert.equal(valueOf('tanh(0)', RAD), 0);
    approx(valueOf('sinh(1)', DEG), Math.sinh(1));
  });
  test('names are case-insensitive', () => assert.equal(valueOf('SIN(30)+Sqrt(4)', DEG), 2.5));
  test('a function without parentheses takes the next operand', () => {
    assert.equal(valueOf('sin30', DEG), 0.5);
    assert.equal(valueOf('sin 30 + 1', DEG), 1.5);
  });
  test('sin(30)^2 squares the function result', () => assert.equal(valueOf('sin(30)^2', DEG), 0.25));
});

describe('angle modes', () => {
  test('DEG: exact values at quarter turns', () => {
    assert.equal(valueOf('sin(180)', DEG), 0);
    assert.equal(displayOf('sin(180)', DEG), '0');
    assert.equal(valueOf('cos(90)', DEG), 0);
    assert.equal(valueOf('sin(450)', DEG), 1);
    assert.equal(valueOf('sin(-90)', DEG), -1);
    assert.equal(valueOf('tan(45)', DEG), 1);
  });
  test('DEG: negative and other angles', () => {
    assert.equal(valueOf('sin(-30)', DEG), -0.5);
    assert.equal(valueOf('cos(60)', DEG), 0.5);
  });
  test('DEG: inverse trig returns degrees', () => {
    assert.equal(valueOf('asin(0.5)', DEG), 30);
    assert.equal(valueOf('acos(0)', DEG), 90);
    assert.equal(valueOf('atan(1)', DEG), 45);
    assert.equal(valueOf('acos(-1)', DEG), 180);
  });
  test('RAD: trig input in radians', () => {
    assert.equal(valueOf('sin(π/2)', RAD), 1);
    assert.equal(valueOf('cos(π)', RAD), -1);
    assert.equal(valueOf('sin(π)', RAD), 0);
    assert.equal(valueOf('tan(π/4)', RAD), 1);
    approx(valueOf('sin(1)', RAD), Math.sin(1));
    approx(valueOf('sin(30)', RAD), Math.sin(30));
    assert.equal(valueOf('sin(1e-20)', RAD), 1e-20);
  });
  test('RAD: inverse trig returns radians', () => {
    assert.equal(valueOf('asin(1)', RAD), Math.PI / 2);
    assert.equal(valueOf('atan(1)', RAD), Math.PI / 4);
  });
  test('DEG is the default', () => assert.equal(valueOf('sin(30)'), 0.5));
});

describe('Ans', () => {
  test('Ans is the given last result', () => {
    assert.equal(valueOf('Ans×2', { ans: 21 }), 42);
    assert.equal(valueOf('2Ans', { ans: 3 }), 6);
    assert.equal(valueOf('ans+1', { ans: 1 }), 2);
  });
  test('Ans defaults to 0', () => assert.equal(valueOf('Ans'), 0));
});

describe('display formatting', () => {
  test('0.1+0.2 displays 0.3', () => assert.equal(displayOf('0.1+0.2'), '0.3'));
  test('12 significant digits', () => {
    assert.equal(displayOf('1/3'), '0.333333333333');
    assert.equal(displayOf('2/3'), '0.666666666667');
    assert.equal(displayOf('123456789012'), '123456789012');
  });
  test('exponent notation for very large and very small numbers', () => {
    assert.equal(displayOf('2^50'), '1.12589990684e+15');
    assert.equal(displayOf('10^12'), '1e+12');
    assert.equal(displayOf('1/10^7'), '1e-7');
  });
  test('the full value is kept for Ans', () => assert.equal(valueOf('0.1+0.2'), 0.1 + 0.2));
});

describe('errors', () => {
  test('division by zero', () => {
    assert.equal(errorOf('5/(2-2)').code, ERROR.DIVISION_BY_ZERO);
    assert.equal(errorOf('0/0').code, ERROR.DIVISION_BY_ZERO);
    assert.equal(errorOf('0^-1').code, ERROR.DIVISION_BY_ZERO);
  });
  test('syntax errors carry the character position', () => {
    assert.deepEqual(errorOf('2+'), { code: ERROR.SYNTAX, pos: 2 });
    assert.deepEqual(errorOf('*3'), { code: ERROR.SYNTAX, pos: 0 });
    assert.deepEqual(errorOf('1+2)'), { code: ERROR.SYNTAX, pos: 3 });
    assert.deepEqual(errorOf('()'), { code: ERROR.SYNTAX, pos: 1 });
    assert.deepEqual(errorOf('2#3'), { code: ERROR.SYNTAX, pos: 1 });
    assert.deepEqual(errorOf('1..2'), { code: ERROR.SYNTAX, pos: 2 });
    assert.deepEqual(errorOf('sin'), { code: ERROR.SYNTAX, pos: 3 });
    assert.deepEqual(errorOf(''), { code: ERROR.SYNTAX, pos: 0 });
  });
  test('unknown function names', () => {
    assert.deepEqual(errorOf('foo(2)'), { code: ERROR.UNKNOWN_FUNCTION, pos: 0, name: 'foo' });
    assert.deepEqual(errorOf('2+bar'), { code: ERROR.UNKNOWN_FUNCTION, pos: 2, name: 'bar' });
    assert.deepEqual(errorOf('sinx'), { code: ERROR.UNKNOWN_FUNCTION, pos: 3, name: 'x' });
  });
  test('domain errors', () => {
    for (const expression of ['sqrt(-1)', '√(-4)', 'ln(0)', 'log(-1)', 'log2(0)', 'asin(2)', 'acos(-1.5)', '(-8)^(1/3)']) {
      assert.equal(errorOf(expression).code, ERROR.DOMAIN, expression);
    }
    assert.equal(errorOf('tan(90)', DEG).code, ERROR.DOMAIN);
    assert.equal(errorOf('tan(π/2)', RAD).code, ERROR.DOMAIN);
  });
  test('overflow (non-finite results)', () => {
    for (const expression of ['10^400', '1e308*10', 'exp(1000)', '1e400', 'sinh(1000)']) {
      assert.equal(errorOf(expression).code, ERROR.OVERFLOW, expression);
    }
  });
});
