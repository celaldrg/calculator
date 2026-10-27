import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { MAIN_KEYS, SCIENCE_KEYS, findKey } from '../src/layout.js';
import { createCalculator } from '../src/calculator.js';
import { FUNCTION_NAMES } from '../src/functions.js';
import { keyToAction } from '../src/keys.js';
import { tokenize } from '../src/tokenizer.js';
import { STRINGS } from '../src/i18n.js';

const ALL_KEYS = [...MAIN_KEYS, ...SCIENCE_KEYS];

/** Presses on-screen keys by their labels, the way the UI does. */
function pressLabels(calculator, labels) {
  for (const label of labels) {
    const key = ALL_KEYS.find((candidate) => candidate.label === label);
    assert.ok(key, `no key labelled ${label}`);
    calculator.dispatch(key.action);
  }
}

describe('keypad layout', () => {
  test('main pad is 5x5 and the scientific pad is 5x4', () => {
    assert.equal(MAIN_KEYS.length, 25);
    assert.equal(SCIENCE_KEYS.length, 20);
    assert.equal(new Set(ALL_KEYS.map((key) => key.label)).size, ALL_KEYS.length, 'labels are unique');
  });

  test('every inserted text is valid tokenizer input after a digit', () => {
    for (const key of ALL_KEYS) {
      if (key.action.type === 'insert') assert.doesNotThrow(() => tokenize(`1${key.action.text}`), key.label);
    }
  });

  test('every function can be reached from the keypad', () => {
    const inserted = ALL_KEYS.filter((key) => key.action.type === 'insert').map((key) => key.action.text);
    for (const name of FUNCTION_NAMES) {
      const reachable = inserted.includes(`${name}(`) || (name === 'sqrt' && inserted.includes('√('));
      assert.ok(reachable, name);
    }
  });

  test('keys with symbol labels have translated accessible names', () => {
    for (const key of ALL_KEYS.filter((candidate) => candidate.ariaKey)) {
      assert.ok(STRINGS.en[key.ariaKey], key.ariaKey);
      assert.ok(STRINGS.tr[key.ariaKey], key.ariaKey);
    }
  });

  test('physical keyboard keys find the on-screen key to flash', () => {
    for (const keyName of [...'0123456789', '.', '+', '-', '*', '/', '^', '!', '%', '(', ')', 'Enter', 'Backspace', 'Escape']) {
      assert.ok(findKey(keyToAction(keyName)), keyName);
    }
    assert.equal(findKey(keyToAction('s')), undefined);
  });

  test('done criterion through the keypad: 2+3×4=14, (1+2)^2=9, sin(30°)=0.5, 1÷0 is an error', () => {
    const calculator = createCalculator();
    pressLabels(calculator, ['2', '+', '3', '×', '4', '=']);
    assert.equal(calculator.getState().result, '14');
    pressLabels(calculator, ['AC', '(', '1', '+', '2', ')', 'xʸ', '2', '=']);
    assert.equal(calculator.getState().result, '9');
    pressLabels(calculator, ['sin', '3', '0', '=']);
    assert.equal(calculator.getState().result, '0.5');
    pressLabels(calculator, ['1', '÷', '0', '=']);
    assert.equal(calculator.getState().error.code, 'divisionByZero');
    pressLabels(calculator, ['⌫', '⌫', '⌫', 'AC', '³√', '2', '7', '=']);
    assert.equal(calculator.getState().result, '3');
  });
});

describe('page strings', () => {
  const root = new URL('../', import.meta.url);
  const html = readFileSync(new URL('index.html', root), 'utf8');
  const srcDir = new URL('src/', root);
  const sources = readdirSync(srcDir).map((file) => readFileSync(new URL(file, srcDir), 'utf8'));

  test('every i18n key used by index.html exists in both languages', () => {
    const keys = [...html.matchAll(/data-i18n(?:-aria|-title)?="([^"]+)"/g)].map((match) => match[1]);
    assert.ok(keys.length >= 8);
    for (const key of keys) {
      assert.ok(STRINGS.en[key], key);
      assert.ok(STRINGS.tr[key], key);
    }
  });

  test('every t(lang, "...") key used in src/ exists in both languages', () => {
    const keys = sources.flatMap((code) => [...code.matchAll(/\bt\(lang, '([^']+)'/g)].map((match) => match[1]));
    assert.ok(keys.length >= 5);
    for (const key of keys) {
      assert.ok(STRINGS.en[key], key);
      assert.ok(STRINGS.tr[key], key);
    }
  });

  test('no innerHTML / outerHTML / insertAdjacentHTML in src/', () => {
    for (const code of sources) assert.doesNotMatch(code, /innerHTML|outerHTML|insertAdjacentHTML/);
  });

  test('index.html has the required meta tags and module entry', () => {
    assert.match(html, /^<!doctype html>/);
    assert.match(html, /<html lang="en">/);
    assert.match(html, /property="og:url" content="https:\/\/celaldrg\.github\.io\/calculator\/"/);
    assert.match(html, /property="og:image" content="https:\/\/celaldrg\.github\.io\/calculator\/docs\/screenshot\.png"/);
    assert.match(html, /rel="icon"\s+href="data:image\/svg\+xml,/);
    assert.match(html, /<script type="module" src="src\/main\.js"><\/script>/);
  });
});
