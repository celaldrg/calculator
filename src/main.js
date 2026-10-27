/**
 * Entry point: wires the pure calculator to the page (keypad, keyboard,
 * history, language, storage). "?demo" opens a fixed state for the README screenshot.
 */
import { createCalculator, createDemoCalculator } from './calculator.js';
import { DEFAULT_LANGUAGE, nextLanguage, normalizeLanguage, t } from './i18n.js';
import { keyToAction } from './keys.js';
import { findKey, MAIN_KEYS, SCIENCE_KEYS } from './layout.js';
import { loadJSON, saveJSON } from './storage.js';
import { applyTranslations, buildKeypad, flashKey, renderDisplay, renderHistory, showStatus } from './ui.js';

const STORAGE_KEYS = Object.freeze({
  lang: 'calculator.lang',
  history: 'calculator.history',
  angleMode: 'calculator.angleMode',
  ans: 'calculator.ans',
});

/**
 * @param {string} id
 * @returns {HTMLElement}
 */
const byId = (id) => document.getElementById(id);

/** Starts the app once; all DOM access happens from here on. */
function start() {
  const isDemo = new URLSearchParams(window.location.search).has('demo');
  let lang = normalizeLanguage(loadJSON(STORAGE_KEYS.lang, DEFAULT_LANGUAGE));
  let calculator = isDemo
    ? createDemoCalculator()
    : createCalculator({
        angleMode: loadJSON(STORAGE_KEYS.angleMode, undefined),
        history: loadJSON(STORAGE_KEYS.history, []),
        ans: Number(loadJSON(STORAGE_KEYS.ans, 0)),
      });

  const calc = byId('calc');
  const displayRefs = {
    display: byId('display'),
    expr: byId('expr'),
    preview: byId('preview'),
    result: byId('result'),
    modeBadge: byId('mode-badge'),
    ansLabel: byId('ans-label'),
    copyButton: byId('copy-btn'),
    angleButton: byId('angle-btn'),
  };
  const historyRefs = { list: byId('history-list'), empty: byId('history-empty'), clearButton: byId('clear-history') };
  const copyStatus = byId('copy-status');
  const fnButton = byId('fn-btn');
  let renderedHistory = '';

  /** Saves history, angle mode and Ans (never in demo mode, so a visit to ?demo keeps real data). */
  function persist() {
    if (isDemo) return;
    const { history, angleMode, ans } = calculator.getState();
    saveJSON(STORAGE_KEYS.history, history);
    saveJSON(STORAGE_KEYS.angleMode, angleMode);
    saveJSON(STORAGE_KEYS.ans, ans);
  }

  function render() {
    const state = calculator.getState();
    renderDisplay(displayRefs, state, lang);
    const historyKey = `${lang}|${JSON.stringify(state.history)}`;
    if (historyKey !== renderedHistory) {
      renderHistory(historyRefs, state.history, lang);
      renderedHistory = historyKey;
    }
  }

  /** Runs a calculator action, then saves and redraws. */
  function run(update) {
    update();
    persist();
    render();
  }

  /** @param {import('./calculator.js').CalculatorAction} action */
  const dispatch = (action) => run(() => calculator.dispatch(action));

  const keyButtons = new Map([
    ...buildKeypad(byId('sci-pad'), SCIENCE_KEYS, (key) => dispatch(key.action)),
    ...buildKeypad(byId('main-pad'), MAIN_KEYS, (key) => dispatch(key.action)),
  ]);

  /** @param {KeyboardEvent} event */
  function onKeyDown(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const onControl = event.target instanceof Element && event.target.closest('button, a');
    if (event.key === 'Enter' && onControl) return;
    const action = keyToAction(event.key);
    if (!action) return;
    event.preventDefault();
    dispatch(action);
    const key = findKey(action);
    if (key) flashKey(keyButtons.get(key));
  }

  async function copyResult() {
    const { result, preview } = calculator.getState();
    try {
      await navigator.clipboard.writeText(result || preview);
      showStatus(copyStatus, t(lang, 'action.copied'));
    } catch {
      showStatus(copyStatus, t(lang, 'action.copyFailed'));
    }
  }

  function toggleFunctions() {
    const open = calc.classList.toggle('fn-open');
    fnButton.setAttribute('aria-expanded', String(open));
  }

  function switchLanguage() {
    lang = nextLanguage(lang);
    saveJSON(STORAGE_KEYS.lang, lang);
    applyTranslations(lang);
    render();
  }

  /** Header "Reset": a fresh calculator (Ans = 0); angle mode and history stay. */
  function reset() {
    const { angleMode, history } = calculator.getState();
    run(() => {
      calculator = createCalculator({ angleMode, history });
    });
  }

  function useHistoryEntry(event) {
    const item = event.target instanceof Element ? event.target.closest('[data-index]') : null;
    if (item) run(() => calculator.useHistory(Number(item.dataset.index)));
  }

  /** Mouse and touch presses must not leave focus on a button, so Enter keeps meaning "=". */
  function keepFocusOffButtons(event) {
    if (event.target instanceof Element && event.target.closest('button')) event.preventDefault();
  }

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('mousedown', keepFocusOffButtons);
  displayRefs.copyButton.addEventListener('click', copyResult);
  displayRefs.angleButton.addEventListener('click', () => dispatch({ type: 'toggleAngle' }));
  fnButton.addEventListener('click', toggleFunctions);
  byId('lang-btn').addEventListener('click', switchLanguage);
  byId('reset-btn').addEventListener('click', reset);
  historyRefs.clearButton.addEventListener('click', () => run(() => calculator.clearHistory()));
  historyRefs.list.addEventListener('click', useHistoryEntry);

  applyTranslations(lang);
  render();
}

start();
