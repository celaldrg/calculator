import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createCalculator, createDemoCalculator, DEMO_EXPRESSION } from '../src/calculator.js';
import { HISTORY_LIMIT } from '../src/history.js';
import { ERROR } from '../src/errors.js';

/** Types each string in turn, as keypad buttons would. */
function type(calculator, ...texts) {
  for (const text of texts) calculator.insert(text);
}

describe('createCalculator', () => {
  test('starts empty in DEG mode', () => {
    assert.deepEqual(createCalculator().getState(), {
      expression: '',
      preview: '',
      result: '',
      error: null,
      angleMode: 'DEG',
      ans: 0,
      history: [],
      evaluated: false,
    });
  });

  test('restores saved options and ignores invalid ones', () => {
    const state = createCalculator({
      angleMode: 'RAD',
      ans: 7,
      history: [{ expression: '1+1', result: '2', extra: true }, null, { expression: 3 }],
    }).getState();
    assert.equal(state.angleMode, 'RAD');
    assert.equal(state.ans, 7);
    assert.deepEqual(state.history, [{ expression: '1+1', result: '2' }]);

    const fallback = createCalculator({ angleMode: 'GRAD', ans: Number.NaN, history: 'oops' }).getState();
    assert.equal(fallback.angleMode, 'DEG');
    assert.equal(fallback.ans, 0);
    assert.deepEqual(fallback.history, []);
  });

  test('getState returns a copy', () => {
    const calculator = createCalculator();
    type(calculator, '1');
    calculator.evaluate();
    const snapshot = calculator.getState();
    snapshot.history[0].expression = 'changed';
    snapshot.expression = 'changed';
    assert.equal(calculator.getState().history[0].expression, '1');
    assert.equal(calculator.getState().expression, '1');
  });
});

describe('typing and live preview', () => {
  test('preview follows complete expressions only', () => {
    const calculator = createCalculator();
    type(calculator, '2', '+');
    assert.equal(calculator.getState().preview, '');
    type(calculator, '3', '×', '4');
    assert.equal(calculator.getState().expression, '2+3×4');
    assert.equal(calculator.getState().preview, '14');
  });

  test('preview auto-closes parentheses', () => {
    const calculator = createCalculator();
    type(calculator, 'sin(', '30');
    assert.equal(calculator.getState().preview, '0.5');
  });

  test('backspace removes whole function names, Ans and pi, otherwise one character', () => {
    const calculator = createCalculator();
    type(calculator, '2', '×', 'sin(');
    calculator.backspace();
    assert.equal(calculator.getState().expression, '2×');
    type(calculator, 'log2(');
    calculator.backspace();
    assert.equal(calculator.getState().expression, '2×');
    type(calculator, '√(');
    calculator.backspace();
    assert.equal(calculator.getState().expression, '2×');
    type(calculator, 'Ans');
    calculator.backspace();
    assert.equal(calculator.getState().expression, '2×');
    type(calculator, 'pi');
    calculator.backspace();
    assert.equal(calculator.getState().expression, '2×');
    type(calculator, 'asin(');
    calculator.backspace();
    assert.equal(calculator.getState().expression, '2×');
    calculator.backspace();
    calculator.backspace();
    assert.equal(calculator.getState().expression, '');
    calculator.backspace();
    assert.equal(calculator.getState().expression, '');
  });
});

describe('evaluate', () => {
  test('stores the result, Ans and a history entry', () => {
    const calculator = createCalculator();
    type(calculator, '2+3*4');
    calculator.evaluate();
    const state = calculator.getState();
    assert.equal(state.result, '14');
    assert.equal(state.ans, 14);
    assert.equal(state.preview, '');
    assert.equal(state.evaluated, true);
    assert.deepEqual(state.history, [{ expression: '2+3*4', result: '14' }]);
  });

  test('pressing = again does not duplicate history', () => {
    const calculator = createCalculator();
    type(calculator, '1+1');
    calculator.evaluate();
    calculator.evaluate();
    assert.equal(calculator.getState().history.length, 1);
  });

  test('an empty expression does nothing', () => {
    const calculator = createCalculator();
    calculator.evaluate();
    assert.deepEqual(calculator.getState().history, []);
  });

  test('an operator after = continues from Ans', () => {
    const calculator = createCalculator();
    type(calculator, '20+1');
    calculator.evaluate();
    type(calculator, '×', '2');
    assert.equal(calculator.getState().expression, 'Ans×2');
    assert.equal(calculator.getState().preview, '42');
    calculator.evaluate();
    assert.equal(calculator.getState().result, '42');
  });

  test('a digit or function after = starts a new expression', () => {
    const calculator = createCalculator();
    type(calculator, '5');
    calculator.evaluate();
    type(calculator, '7');
    assert.equal(calculator.getState().expression, '7');
    calculator.evaluate();
    type(calculator, 'sin(');
    assert.equal(calculator.getState().expression, 'sin(');
  });

  test('errors are recorded as codes and cleared by the next edit', () => {
    const calculator = createCalculator();
    type(calculator, '1/0');
    calculator.evaluate();
    let state = calculator.getState();
    assert.deepEqual(state.error, { code: ERROR.DIVISION_BY_ZERO });
    assert.equal(state.result, '');
    assert.equal(state.history.length, 0);
    assert.equal(state.ans, 0);
    calculator.backspace();
    type(calculator, '4');
    state = calculator.getState();
    assert.equal(state.error, null);
    assert.equal(state.preview, '0.25');
  });

  test('clear keeps Ans and history', () => {
    const calculator = createCalculator();
    type(calculator, '6×7');
    calculator.evaluate();
    calculator.clear();
    const state = calculator.getState();
    assert.equal(state.expression, '');
    assert.equal(state.result, '');
    assert.equal(state.ans, 42);
    assert.equal(state.history.length, 1);
  });
});

describe('angle mode', () => {
  test('toggling recomputes the preview', () => {
    const calculator = createCalculator();
    type(calculator, 'sin(π/2)');
    assert.notEqual(calculator.getState().preview, '1');
    calculator.toggleAngle();
    assert.equal(calculator.getState().angleMode, 'RAD');
    assert.equal(calculator.getState().preview, '1');
    calculator.toggleAngle();
    assert.equal(calculator.getState().angleMode, 'DEG');
  });

  test('toggling after = keeps the shown result', () => {
    const calculator = createCalculator();
    type(calculator, 'sin(30)');
    calculator.evaluate();
    calculator.toggleAngle();
    assert.equal(calculator.getState().result, '0.5');
    assert.equal(calculator.getState().preview, '');
  });
});

describe('history', () => {
  test(`keeps the newest ${HISTORY_LIMIT} entries`, () => {
    const calculator = createCalculator();
    for (let i = 1; i <= HISTORY_LIMIT + 5; i += 1) {
      calculator.clear();
      type(calculator, `${i}+0`);
      calculator.evaluate();
    }
    const { history } = calculator.getState();
    assert.equal(history.length, HISTORY_LIMIT);
    assert.equal(history[0].expression, `${HISTORY_LIMIT + 5}+0`);
    assert.equal(history.at(-1).expression, '6+0');
  });

  test('useHistory loads an entry for editing; bad indexes are ignored', () => {
    const calculator = createCalculator();
    type(calculator, '2^10');
    calculator.evaluate();
    type(calculator, '3');
    calculator.useHistory(0);
    assert.equal(calculator.getState().expression, '2^10');
    assert.equal(calculator.getState().preview, '1024');
    assert.equal(calculator.getState().evaluated, false);
    calculator.useHistory(5);
    assert.equal(calculator.getState().expression, '2^10');
  });

  test('clearHistory empties the list', () => {
    const calculator = createCalculator({ history: [{ expression: '1', result: '1' }] });
    calculator.clearHistory();
    assert.deepEqual(calculator.getState().history, []);
  });
});

describe('dispatch', () => {
  test('routes actions to the calculator', () => {
    const calculator = createCalculator();
    for (const action of [
      { type: 'insert', text: '9' },
      { type: 'insert', text: '9' },
      { type: 'backspace' },
      { type: 'insert', text: '!' },
      { type: 'toggleAngle' },
      { type: 'unknown' },
      { type: 'evaluate' },
    ]) {
      calculator.dispatch(action);
    }
    let state = calculator.getState();
    assert.equal(state.result, '362880');
    assert.equal(state.angleMode, 'RAD');
    calculator.dispatch({ type: 'clear' });
    state = calculator.getState();
    assert.equal(state.expression, '');
  });
});

describe('demo state', () => {
  test('shows the demo expression evaluated with earlier history', () => {
    const state = createDemoCalculator().getState();
    assert.equal(state.expression, DEMO_EXPRESSION);
    assert.equal(state.expression, 'sin(30)+√(16)×2^3');
    assert.equal(state.result, '32.5');
    assert.equal(state.ans, 32.5);
    assert.equal(state.angleMode, 'DEG');
    assert.equal(state.error, null);
    assert.deepEqual(
      state.history.map((entry) => `${entry.expression}=${entry.result}`),
      ['sin(30)+√(16)×2^3=32.5', '√(2)=1.41421356237', '5!=120', '(1+2)^2=9', '2+3×4=14'],
    );
  });

  test('is deterministic', () => {
    assert.deepEqual(createDemoCalculator().getState(), createDemoCalculator().getState());
  });
});
