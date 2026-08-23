import { describe, expect, it } from 'vitest';

import { type StepContext } from '@/game-v2/contracts/StepContext';
import { assertStepContext } from '@/game-v2/systems/StepContextValidator';

const makeContext = (overrides: Partial<StepContext> = {}): StepContext => ({
  tick: 0,
  deltaSeconds: 1 / 60,
  intent: {
    moveX: 0,
    moveY: 0,
    dashPressed: false,
  },
  ...overrides,
});

describe('assertStepContext', () => {
  it('accepts a fully valid context', () => {
    expect(() => assertStepContext(makeContext())).not.toThrow();
  });

  it.each([
    ['negative', -1],
    ['non-integer', 1.5],
    ['NaN', Number.NaN],
    ['infinite', Number.POSITIVE_INFINITY],
    ['larger than the safe-integer range', Number.MAX_SAFE_INTEGER + 1],
  ] as const)('rejects a %s tick', (_label, tick) => {
    expect(() => assertStepContext(makeContext({ tick }))).toThrow(RangeError);
  });

  it('accepts tick zero', () => {
    expect(() => assertStepContext(makeContext({ tick: 0 }))).not.toThrow();
  });

  it.each([
    ['zero', 0],
    ['negative', -0.1],
    ['NaN', Number.NaN],
    ['infinite', Number.POSITIVE_INFINITY],
  ] as const)('rejects a %s deltaSeconds value', (_label, deltaSeconds) => {
    expect(() => assertStepContext(makeContext({ deltaSeconds }))).toThrow(RangeError);
  });

  it('accepts a small positive deltaSeconds value', () => {
    expect(() =>
      assertStepContext(makeContext({ deltaSeconds: Number.MIN_VALUE }))
    ).not.toThrow();
  });

  it.each([
    ['moveX', { moveX: Number.NaN, moveY: 0, dashPressed: false }],
    ['moveX', { moveX: Number.POSITIVE_INFINITY, moveY: 0, dashPressed: false }],
    ['moveY', { moveX: 0, moveY: Number.NaN, dashPressed: false }],
    ['moveY', { moveX: 0, moveY: Number.POSITIVE_INFINITY, dashPressed: false }],
  ] as const)('rejects a non-finite %s axis', (_axis, intent) => {
    expect(() => assertStepContext(makeContext({ intent }))).toThrow(RangeError);
  });

  it('rejects a non-boolean dashPressed value with a TypeError', () => {
    const intent = {
      moveX: 0,
      moveY: 0,
      dashPressed: 'false',
    } as unknown as StepContext['intent'];

    expect(() => assertStepContext(makeContext({ intent }))).toThrow(TypeError);
  });
});
