import { CalcError, ERROR } from './errors.js';

/**
 * @typedef {import('./tokenizer.js').Token} Token
 * @typedef {{type: 'num', value: number}
 *   | {type: 'const', name: string}
 *   | {type: 'ans'}
 *   | {type: 'neg', arg: Node}
 *   | {type: 'binary', op: string, left: Node, right: Node}
 *   | {type: 'postfix', op: string, arg: Node}
 *   | {type: 'call', name: string, arg: Node}} Node
 */

/** Token types that can start an implicitly multiplied factor: 2π, 2(3), 3sin(30). */
const IMPLICIT_FACTOR_TYPES = new Set(['num', 'const', 'ans', 'func', 'lparen']);

/**
 * Recursive-descent parser. Grammar, lowest precedence first:
 *   expression := term (('+' | '-') term)*
 *   term       := unary (('*' | '/') unary | implicit unary)*
 *   unary      := ('+' | '-') unary | power
 *   power      := postfix ('^' unary)?            right-associative
 *   postfix    := primary ('!' | '%')*
 *   primary    := number | constant | Ans | '(' expression ')'? | function ('(' expression ')'? | unary)
 * Missing closing parentheses at the end of the input are closed automatically.
 */
class Parser {
  /**
   * @param {Token[]} tokens
   * @param {number} inputLength Used as the error position at the end of the input.
   */
  constructor(tokens, inputLength) {
    this.tokens = tokens;
    this.index = 0;
    this.inputLength = inputLength;
  }

  peek() {
    return this.tokens[this.index];
  }

  advance() {
    const token = this.tokens[this.index];
    this.index += 1;
    return token;
  }

  /** @param {...string} ops */
  peekOp(...ops) {
    const token = this.peek();
    return token !== undefined && token.type === 'op' && ops.includes(token.op);
  }

  /** @param {Token} [token] The offending token; end of input when omitted. */
  fail(token = this.peek()) {
    throw new CalcError(ERROR.SYNTAX, { pos: token ? token.pos : this.inputLength });
  }

  parseExpression() {
    let left = this.parseTerm();
    while (this.peekOp('+', '-')) {
      const { op } = this.advance();
      left = { type: 'binary', op, left, right: this.parseTerm() };
    }
    return left;
  }

  parseTerm() {
    let left = this.parseUnary();
    for (;;) {
      if (this.peekOp('*', '/')) {
        const { op } = this.advance();
        left = { type: 'binary', op, left, right: this.parseUnary() };
      } else if (this.startsImplicitFactor()) {
        left = { type: 'binary', op: '*', left, right: this.parseUnary() };
      } else {
        return left;
      }
    }
  }

  /** Two plain numbers in a row ("2 3") are a syntax error, not a product. */
  startsImplicitFactor() {
    const token = this.peek();
    if (!token || !IMPLICIT_FACTOR_TYPES.has(token.type)) return false;
    return !(token.type === 'num' && this.tokens[this.index - 1].type === 'num');
  }

  parseUnary() {
    if (this.peekOp('+', '-')) {
      const { op } = this.advance();
      const arg = this.parseUnary();
      return op === '-' ? { type: 'neg', arg } : arg;
    }
    return this.parsePower();
  }

  parsePower() {
    const base = this.parsePostfix();
    if (!this.peekOp('^')) return base;
    this.advance();
    return { type: 'binary', op: '^', left: base, right: this.parseUnary() };
  }

  parsePostfix() {
    let node = this.parsePrimary();
    while (this.peek()?.type === 'postfix') {
      node = { type: 'postfix', op: this.advance().op, arg: node };
    }
    return node;
  }

  parsePrimary() {
    const token = this.peek();
    if (!token) this.fail();
    this.advance();
    switch (token.type) {
      case 'num':
        return { type: 'num', value: token.value };
      case 'const':
        return { type: 'const', name: token.name };
      case 'ans':
        return { type: 'ans' };
      case 'lparen':
        return this.parseGroup();
      case 'func':
        return { type: 'call', name: token.name, arg: this.parseArgument() };
      default:
        return this.fail(token);
    }
  }

  /** Function argument: a parenthesised group, or a single operand as in √16 or sin30. */
  parseArgument() {
    if (this.peek()?.type !== 'lparen') return this.parseUnary();
    this.advance();
    return this.parseGroup();
  }

  /** Parses the inside of a group whose '(' was already consumed. */
  parseGroup() {
    const inner = this.parseExpression();
    const token = this.peek();
    if (token?.type === 'rparen') this.advance();
    else if (token) this.fail(token);
    return inner;
  }
}

/**
 * Builds a syntax tree from tokens.
 * @param {Token[]} tokens
 * @param {number} inputLength Length of the source string (error position for "unexpected end").
 * @returns {Node}
 * @throws {CalcError} syntax, with the character position of the problem.
 */
export function parse(tokens, inputLength) {
  const parser = new Parser(tokens, inputLength);
  const tree = parser.parseExpression();
  if (parser.peek()) parser.fail();
  return tree;
}
