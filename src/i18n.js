/** Supported interface languages; English is the default. */
export const LANGUAGES = Object.freeze(['en', 'tr']);
export const DEFAULT_LANGUAGE = 'en';

/** All visible strings. Both languages must have the same keys (checked by the tests). */
export const STRINGS = Object.freeze({
  en: {
    'app.title': 'Scientific Calculator',
    'app.description':
      'A scientific calculator with its own expression parser, DEG/RAD modes, history and keyboard support.',
    'action.reset': 'Reset',
    'action.language': 'Switch to Turkish',
    'action.copy': 'Copy result',
    'action.copied': 'Copied!',
    'action.functions': 'Show or hide scientific functions',
    'action.copyFailed': 'Copy failed',
    'action.functionsShort': 'fn',
    'display.label': 'Calculator display',
    'display.placeholder': 'Type an expression',
    'key.clear': 'All clear',
    'key.backspace': 'Delete last',
    'key.equals': 'Equals',
    'key.angle': 'Angle mode: {mode}',
    'key.ans': 'Last answer (Ans)',
    'display.ans': 'Ans = {value}',
    'hint.keyboard': 'Keyboard: type freely · Enter = · Esc clears · Backspace deletes',
    'history.title': 'History',
    'history.clear': 'Clear history',
    'history.empty': 'No calculations yet',
    'history.reuse': 'Reuse {expression}',
    'footer.source': 'Source on GitHub',
    'error.divisionByZero': 'Division by zero',
    'error.syntax': 'Syntax error at character {pos}',
    'error.unknownFunction': 'Unknown function: {name}',
    'error.domain': 'Math domain error',
    'error.overflow': 'Result too large',
  },
  tr: {
    'app.title': 'Bilimsel Hesap Makinesi',
    'app.description':
      'Kendi ifade ayrıştırıcısı, DEG/RAD modları, geçmişi ve klavye desteği olan bilimsel hesap makinesi.',
    'action.reset': 'Sıfırla',
    'action.language': 'İngilizceye geç',
    'action.copy': 'Sonucu kopyala',
    'action.copied': 'Kopyalandı!',
    'action.functions': 'Bilimsel fonksiyonları göster veya gizle',
    'action.copyFailed': 'Kopyalanamadı',
    'action.functionsShort': 'fn',
    'display.label': 'Hesap makinesi ekranı',
    'display.placeholder': 'Bir ifade yazın',
    'key.clear': 'Tümünü temizle',
    'key.backspace': 'Sonuncuyu sil',
    'key.equals': 'Eşittir',
    'key.angle': 'Açı birimi: {mode}',
    'key.ans': 'Son sonuç (Ans)',
    'display.ans': 'Ans = {value}',
    'hint.keyboard': 'Klavye: serbestçe yazın · Enter = · Esc temizler · Backspace siler',
    'history.title': 'Geçmiş',
    'history.clear': 'Geçmişi temizle',
    'history.empty': 'Henüz hesaplama yok',
    'history.reuse': '{expression} ifadesini yeniden kullan',
    'footer.source': 'Kaynak kodu GitHub’da',
    'error.divisionByZero': 'Sıfıra bölme hatası',
    'error.syntax': 'Sözdizimi hatası ({pos}. karakter)',
    'error.unknownFunction': 'Bilinmeyen fonksiyon: {name}',
    'error.domain': 'Tanım kümesi hatası',
    'error.overflow': 'Sonuç çok büyük',
  },
});

/**
 * Returns a supported language code, falling back to English.
 * @param {unknown} value e.g. a saved preference
 * @returns {'en'|'tr'}
 */
export function normalizeLanguage(value) {
  return LANGUAGES.includes(value) ? value : DEFAULT_LANGUAGE;
}

/**
 * The language the toggle switches to (its button shows this code, upper-cased).
 * @param {string} lang
 * @returns {'en'|'tr'}
 */
export function nextLanguage(lang) {
  return normalizeLanguage(lang) === 'en' ? 'tr' : 'en';
}

/**
 * Translates a key and fills {placeholders}. Falls back to English, then to the key itself.
 * @param {string} lang
 * @param {string} key
 * @param {Record<string, string|number>} [params]
 * @returns {string}
 */
export function t(lang, key, params = {}) {
  const template = STRINGS[normalizeLanguage(lang)][key] ?? STRINGS.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (placeholder, name) =>
    name in params ? String(params[name]) : placeholder,
  );
}

/**
 * Human-readable message for an engine error (positions shown 1-based).
 * @param {string} lang
 * @param {import('./engine.js').CalcFailure} error
 * @returns {string}
 */
export function errorMessage(lang, error) {
  return t(lang, `error.${error.code}`, { pos: (error.pos ?? 0) + 1, name: error.name ?? '' });
}
