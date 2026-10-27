/** Maximum number of history entries kept (and persisted). */
export const HISTORY_LIMIT = 50;

/**
 * @typedef {{expression: string, result: string}} HistoryEntry
 */

/**
 * @param {unknown} entry
 * @returns {boolean}
 */
function isEntry(entry) {
  return (
    entry !== null &&
    typeof entry === 'object' &&
    typeof entry.expression === 'string' &&
    typeof entry.result === 'string'
  );
}

/**
 * Returns a new history with `entry` first, capped at HISTORY_LIMIT.
 * @param {HistoryEntry[]} history Newest first.
 * @param {HistoryEntry} entry
 * @returns {HistoryEntry[]}
 */
export function addEntry(history, entry) {
  return [entry, ...history].slice(0, HISTORY_LIMIT);
}

/**
 * Cleans history loaded from storage: drops malformed entries and extra fields, caps the length.
 * @param {unknown} raw
 * @returns {HistoryEntry[]}
 */
export function sanitizeHistory(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isEntry)
    .slice(0, HISTORY_LIMIT)
    .map(({ expression, result }) => ({ expression, result }));
}
