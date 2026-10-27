import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { keyToAction } from '../src/keys.js';
import { loadJSON, saveJSON } from '../src/storage.js';
import { STRINGS, t, errorMessage, nextLanguage, normalizeLanguage } from '../src/i18n.js';
import { ERROR } from '../src/errors.js';
import { addEntry, sanitizeHistory, HISTORY_LIMIT } from '../src/history.js';

describe('keyToAction', () => {
  test('commands', () => {
    assert.deepEqual(keyToAction('Enter'), { type: 'evaluate' });
    assert.deepEqual(keyToAction('='), { type: 'evaluate' });
    assert.deepEqual(keyToAction('Backspace'), { type: 'backspace' });
    assert.deepEqual(keyToAction('Escape'), { type: 'clear' });
  });
  test('digits, operators, parentheses, ^ and ! insert text', () => {
    for (const key of ['0', '7', '.', '+', '^', '!', '%', '(', ')', 's']) {
      assert.deepEqual(keyToAction(key), { type: 'insert', text: key }, key);
    }
  });
  test('ASCII operators become display symbols; comma is a decimal point', () => {
    assert.deepEqual(keyToAction('*'), { type: 'insert', text: '×' });
    assert.deepEqual(keyToAction('/'), { type: 'insert', text: '÷' });
    assert.deepEqual(keyToAction('-'), { type: 'insert', text: '−' });
    assert.deepEqual(keyToAction(','), { type: 'insert', text: '.' });
  });
  test('other keys are ignored', () => {
    for (const key of ['Shift', 'Tab', 'ArrowLeft', ' ', 'ş', 'F5']) assert.equal(keyToAction(key), null, key);
  });
});

describe('storage helper', () => {
  const memoryStore = () => {
    const data = new Map();
    return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  };
  const brokenStore = {
    getItem() {
      throw new Error('SecurityError');
    },
    setItem() {
      throw new Error('QuotaExceededError');
    },
  };

  test('round-trips JSON', () => {
    const store = memoryStore();
    assert.equal(saveJSON('calc.history', [{ expression: '1', result: '1' }], store), true);
    assert.deepEqual(loadJSON('calc.history', [], store), [{ expression: '1', result: '1' }]);
  });
  test('missing keys and invalid JSON return the fallback', () => {
    const store = memoryStore();
    assert.equal(loadJSON('nothing', 'en', store), 'en');
    store.setItem('bad', '{not json');
    assert.deepEqual(loadJSON('bad', [], store), []);
  });
  test('throwing or missing storage never crashes', () => {
    assert.equal(loadJSON('key', 'fallback', brokenStore), 'fallback');
    assert.equal(saveJSON('key', 1, brokenStore), false);
    assert.equal(loadJSON('key', 'fallback', null), 'fallback');
    assert.equal(saveJSON('key', 1, null), false);
  });
});

describe('history helpers', () => {
  test('addEntry puts the newest first and caps the length', () => {
    let history = [];
    for (let i = 0; i < HISTORY_LIMIT + 3; i += 1) history = addEntry(history, { expression: `${i}`, result: `${i}` });
    assert.equal(history.length, HISTORY_LIMIT);
    assert.equal(history[0].expression, `${HISTORY_LIMIT + 2}`);
  });
  test('sanitizeHistory caps stored lists', () => {
    const stored = Array.from({ length: 80 }, (_, i) => ({ expression: `${i}`, result: `${i}` }));
    assert.equal(sanitizeHistory(stored).length, HISTORY_LIMIT);
    assert.deepEqual(sanitizeHistory(null), []);
  });
});

describe('i18n', () => {
  test('English and Turkish have the same keys and no empty strings', () => {
    assert.deepEqual(Object.keys(STRINGS.tr).sort(), Object.keys(STRINGS.en).sort());
    for (const lang of ['en', 'tr']) {
      for (const [key, value] of Object.entries(STRINGS[lang])) assert.ok(value.trim(), `${lang}.${key}`);
    }
  });
  test('every engine error code has a message in both languages', () => {
    for (const code of Object.values(ERROR)) {
      assert.ok(STRINGS.en[`error.${code}`], code);
      assert.ok(STRINGS.tr[`error.${code}`], code);
    }
  });
  test('t fills placeholders and falls back sensibly', () => {
    assert.equal(t('tr', 'app.title'), 'Bilimsel Hesap Makinesi');
    assert.equal(t('en', 'key.angle', { mode: 'RAD' }), 'Angle mode: RAD');
    assert.equal(t('de', 'app.title'), 'Scientific Calculator');
    assert.equal(t('en', 'missing.key'), 'missing.key');
  });
  test('errorMessage shows 1-based positions and names', () => {
    assert.equal(errorMessage('en', { code: ERROR.SYNTAX, pos: 2 }), 'Syntax error at character 3');
    assert.equal(errorMessage('tr', { code: ERROR.SYNTAX, pos: 0 }), 'Sözdizimi hatası (1. karakter)');
    assert.equal(errorMessage('en', { code: ERROR.UNKNOWN_FUNCTION, pos: 0, name: 'foo' }), 'Unknown function: foo');
    assert.equal(errorMessage('tr', { code: ERROR.DIVISION_BY_ZERO }), 'Sıfıra bölme hatası');
  });
  test('language helpers', () => {
    assert.equal(normalizeLanguage('tr'), 'tr');
    assert.equal(normalizeLanguage('xx'), 'en');
    assert.equal(normalizeLanguage(null), 'en');
    assert.equal(nextLanguage('en'), 'tr');
    assert.equal(nextLanguage('tr'), 'en');
  });
});

describe('source rules', () => {
  const srcDir = new URL('../src/', import.meta.url);
  const sources = readdirSync(srcDir)
    .filter((file) => file.endsWith('.js'))
    .map((file) => [file, readFileSync(new URL(file, srcDir), 'utf8')]);

  test('no eval, Function constructor or console.log in src/', () => {
    for (const [file, code] of sources) {
      assert.doesNotMatch(code, /\beval\s*\(/, file);
      assert.doesNotMatch(code, /\bnew\s+Function\b|\bFunction\s*\(/, file);
      assert.doesNotMatch(code, /\bconsole\.log\b/, file);
    }
  });
});
