import { describe, expect, it } from 'vitest';

import {
  createPositionContext,
  LEVERAGE_MODES,
  UNSPECIFIED_POSITION_CONTEXT,
  type PositionContextInput,
} from '@/game-v2/contracts/PositionContext';

const VALID_INPUT: PositionContextInput = {
  asset: 'BTC',
  side: 'LONG',
  leverage: 5,
  entryPrice: 65_000,
  lockedAtTick: 42,
};

describe('createPositionContext', () => {
  it('freezes and returns a valid position', () => {
    const position = createPositionContext(VALID_INPUT);

    expect(position).toEqual(VALID_INPUT);
    expect(Object.isFrozen(position)).toBe(true);
  });

  it.each([
    ['invalid side', { side: 'FLAT' }],
    ['leverage outside the five modes', { leverage: 2 }],
    ['non-finite entryPrice', { entryPrice: Number.NaN }],
    ['zero entryPrice', { entryPrice: 0 }],
    ['negative entryPrice', { entryPrice: -1 }],
    ['non-integer lockedAtTick', { lockedAtTick: 1.5 }],
    ['negative lockedAtTick', { lockedAtTick: -1 }],
  ] as const)('rejects %s', (_label, override) => {
    expect(() =>
      createPositionContext({
        ...VALID_INPUT,
        ...override,
      } as PositionContextInput)
    ).toThrow(RangeError);
  });

  it('accepts every documented leverage mode', () => {
    for (const leverage of LEVERAGE_MODES) {
      expect(() => createPositionContext({ ...VALID_INPUT, leverage })).not.toThrow();
    }
  });
});

describe('UNSPECIFIED_POSITION_CONTEXT', () => {
  it('is itself a valid, frozen position context', () => {
    expect(Object.isFrozen(UNSPECIFIED_POSITION_CONTEXT)).toBe(true);
    expect(() => createPositionContext(UNSPECIFIED_POSITION_CONTEXT)).not.toThrow();
  });
});
