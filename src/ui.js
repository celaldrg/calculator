/**
 * DOM rendering helpers. Text is always set with textContent (never parsed as HTML),
 * and every visible string comes from i18n.js.
 */
import { formatNumber } from './format.js';
import { errorMessage, nextLanguage, t } from './i18n.js';

const PRESS_FEEDBACK_MS = 160;
const STATUS_VISIBLE_MS = 1600;

/** Pending "remove the class again" timers, per element. */
const timers = new WeakMap();

/** Result lengths above which the result line uses a smaller font. */
const RESULT_SIZES = [
  { minLength: 15, size: 's' },
  { minLength: 10, size: 'm' },
];

/**
 * @typedef {import('./calculator.js').CalculatorState} CalculatorState
 * @typedef {import('./layout.js').KeyDef} KeyDef
 * @typedef {object} DisplayRefs
 * @property {HTMLElement} display
 * @property {HTMLElement} expr
 * @property {HTMLElement} preview
 * @property {HTMLElement} result
 * @property {HTMLElement} modeBadge
 * @property {HTMLElement} ansLabel
 * @property {HTMLButtonElement} copyButton
 * @property {HTMLButtonElement} angleButton
 */

/**
 * Applies a language to the static page: [data-i18n] text, [data-i18n-aria]
 * accessible names, [data-i18n-title] tooltips, <html lang>, title and description.
 * @param {string} lang
 */
export function applyTranslations(lang) {
  document.documentElement.lang = lang;
  document.title = t(lang, 'app.title');
  document.querySelector('meta[name="description"]')?.setAttribute('content', t(lang, 'app.description'));
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(lang, el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-aria]')) {
    el.setAttribute('aria-label', t(lang, el.dataset.i18nAria));
  }
  for (const el of document.querySelectorAll('[data-i18n-title]')) el.title = t(lang, el.dataset.i18nTitle);
  const langButton = document.getElementById('lang-btn');
  langButton.textContent = nextLanguage(lang).toUpperCase();
}

/**
 * Creates one button per key inside `container`.
 * @param {HTMLElement} container
 * @param {readonly KeyDef[]} keys
 * @param {(key: KeyDef) => void} onPress Called on click (mouse, touch, or Enter/Space on a focused key).
 * @returns {Map<KeyDef, HTMLButtonElement>}
 */
export function buildKeypad(container, keys, onPress) {
  const buttons = new Map();
  for (const key of keys) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `key key--${key.kind}`;
    button.textContent = key.label;
    if (key.ariaKey) button.dataset.i18nAria = key.ariaKey;
    button.addEventListener('pointerdown', () => flashKey(button));
    button.addEventListener('click', () => onPress(key));
    container.append(button);
    buttons.set(key, button);
  }
  return buttons;
}

/**
 * Adds a class and removes it after `ms`; calling again restarts the countdown.
 * @param {HTMLElement} el
 * @param {string} className
 * @param {number} ms
 */
function addClassBriefly(el, className, ms) {
  el.classList.add(className);
  clearTimeout(timers.get(el));
  timers.set(el, setTimeout(() => el.classList.remove(className), ms));
}

/**
 * Briefly shows a key as pressed (used for pointer and physical-keyboard input).
 * @param {HTMLElement} button
 */
export function flashKey(button) {
  addClassBriefly(button, 'is-pressed', PRESS_FEEDBACK_MS);
}

/**
 * Shows a short status message (e.g. "Copied!") that fades out by itself.
 * @param {HTMLElement} el
 * @param {string} text
 */
export function showStatus(el, text) {
  el.textContent = text;
  addClassBriefly(el, 'is-visible', STATUS_VISIBLE_MS);
}

/**
 * Writes the expression, marking the character (or unknown name) an error points at.
 * @param {HTMLElement} el
 * @param {CalculatorState} state
 * @param {string} lang
 */
function renderExpression(el, state, lang) {
  const { expression, error } = state;
  el.classList.toggle('is-empty', !expression);
  if (!expression) {
    el.textContent = t(lang, 'display.placeholder');
    return;
  }
  const pos = error?.pos;
  if (pos === undefined || pos >= expression.length) {
    el.textContent = expression;
  } else {
    const end = pos + Math.max(1, error.name?.length ?? 1);
    const mark = document.createElement('mark');
    mark.textContent = expression.slice(pos, end);
    el.replaceChildren(expression.slice(0, pos), mark, expression.slice(end));
  }
  el.scrollLeft = el.scrollWidth;
}

/**
 * Text of the big result line: the error message, the result, or "0" when nothing is typed.
 * @param {CalculatorState} state
 * @param {string} lang
 * @returns {string}
 */
function resultText(state, lang) {
  if (state.error) return errorMessage(lang, state.error);
  if (state.result) return state.result;
  return state.expression ? '' : '0';
}

/**
 * Renders the display, the angle toggle and the copy button from the calculator state.
 * @param {DisplayRefs} refs
 * @param {CalculatorState} state
 * @param {string} lang
 */
export function renderDisplay(refs, state, lang) {
  refs.display.classList.toggle('is-evaluated', state.evaluated);
  refs.display.classList.toggle('has-error', Boolean(state.error));
  renderExpression(refs.expr, state, lang);
  refs.preview.textContent = state.preview && !state.error ? `= ${state.preview}` : '';

  const text = resultText(state, lang);
  refs.result.textContent = text;
  refs.result.dataset.size = RESULT_SIZES.find(({ minLength }) => text.length >= minLength)?.size ?? 'l';

  refs.modeBadge.textContent = state.angleMode;
  refs.ansLabel.textContent = t(lang, 'display.ans', { value: formatNumber(state.ans) });
  refs.copyButton.disabled = !(state.result || state.preview);
  refs.angleButton.setAttribute('aria-label', t(lang, 'key.angle', { mode: state.angleMode }));
  for (const option of refs.angleButton.querySelectorAll('[data-mode]')) {
    option.classList.toggle('is-active', option.dataset.mode === state.angleMode);
  }
}

/**
 * Rebuilds the history list (newest first). Each entry is a button carrying data-index.
 * @param {{list: HTMLElement, empty: HTMLElement, clearButton: HTMLButtonElement}} refs
 * @param {CalculatorState['history']} history
 * @param {string} lang
 */
export function renderHistory(refs, history, lang) {
  refs.empty.hidden = history.length > 0;
  refs.clearButton.disabled = history.length === 0;
  const items = history.map((entry, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'history-item';
    button.dataset.index = String(index);
    button.setAttribute('aria-label', t(lang, 'history.reuse', { expression: entry.expression }));
    const expression = document.createElement('span');
    expression.className = 'h-expr';
    expression.textContent = entry.expression;
    const result = document.createElement('span');
    result.className = 'h-result';
    result.textContent = `= ${entry.result}`;
    button.append(expression, result);
    const item = document.createElement('li');
    item.append(button);
    return item;
  });
  refs.list.replaceChildren(...items);
}
