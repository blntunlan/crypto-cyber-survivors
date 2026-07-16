import { describe, expect, it } from 'vitest';
import { PositionRiskManager } from '../../../../services/difficulty/runtime/managers/PositionRiskManager';

const createInput = (side: 'LONG' | 'SHORT') => ({
  constants: {
    runId: `run-${side}`,
    seed: 1,
    side,
    leverage: 5,
    entryPrice: 100,
    liquidationPrice: side === 'LONG' ? 80 : 120,
  },
  currentPrice: 110,
  sourceSequence: 1,
  deltaSeconds: 1,
  validFromTick: 1,
  inputRevision: 1,
});

describe('PositionRiskManager', () => {
  it('keeps long and short risk alignment opposite for the same price move', () => {
    const manager = new PositionRiskManager();
    const long = manager.update(createInput('LONG'));
    manager.reset();
    const short = manager.update(createInput('SHORT'));

    expect(long.value.alignment).toBeGreaterThan(0);
    expect(short.value.alignment).toBeLessThan(0);
  });

  it('uses a neutral non-punitive decision when run constants are missing', () => {
    const manager = new PositionRiskManager();
    const decision = manager.update({ ...createInput('LONG'), constants: null });

    expect(decision.quality).toBe('NEUTRAL');
    expect(decision.value.headwind).toBe(0);
    expect(decision.value.liquidationProximity).toBe(0);
  });
});
