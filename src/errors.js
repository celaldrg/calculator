/** Error codes returned by the calculator engine. The UI translates them (see i18n.js). */
export const ERROR = Object.freeze({
  DIVISION_BY_ZERO: 'divisionByZero',
  SYNTAX: 'syntax',
  UNKNOWN_FUNCTION: 'unknownFunction',
  DOMAIN: 'domain',
  OVERFLOW: 'overflow',
});

/** Error thrown inside the tokenizer, parser and evaluator; calculate() turns it into a result object. */
export class CalcError extends Error {
  /**
   * @param {string} code One of the ERROR values.
   * @param {{pos?: number, name?: string}} [details] Character position and/or offending name.
   */
  constructor(code, details = {}) {
    super(code);
    this.code = code;
    this.details = details;
  }
}
