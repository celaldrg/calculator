/**
 * The only place that touches localStorage. Every access is wrapped in
 * try/catch so private mode, blocked storage or a full quota never crash the app.
 */

/**
 * @typedef {{getItem(key: string): string|null, setItem(key: string, value: string): void}} KeyValueStore
 */

/** @returns {KeyValueStore|null} The browser's localStorage, or null when unavailable. */
function browserStore() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Reads a JSON value.
 * @param {string} key
 * @param {*} fallback Returned when the key is missing, unreadable or not valid JSON.
 * @param {KeyValueStore|null} [store] Defaults to localStorage (injectable for tests).
 * @returns {*}
 */
export function loadJSON(key, fallback, store = browserStore()) {
  try {
    const raw = store?.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * Writes a JSON value.
 * @param {string} key
 * @param {*} value
 * @param {KeyValueStore|null} [store] Defaults to localStorage (injectable for tests).
 * @returns {boolean} Whether the value was saved.
 */
export function saveJSON(key, value, store = browserStore()) {
  if (!store) return false;
  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
