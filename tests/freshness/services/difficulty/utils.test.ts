import { describe, it, expect } from 'vitest';
import {
  clamp,
  calculateLiquidationPrice,
  getDefaultInputs,
} from '../../../../services/difficulty/utils';
import { MarketPosition } from '../../../../types';

describe('difficulty utils', () => {
  it('clamps numeric values inside boundaries', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(12, 0, 10)).toBe(10);
  });

  it('calculates liquidation price with leverage safety buffer', () => {
    expect(calculateLiquidationPrice(100, 10, 'LONG')).toBeCloseTo(91);
    expect(calculateLiquidationPrice(100, 10, 'SHORT')).toBeCloseTo(109);
    expect(calculateLiquidationPrice(0, 10, 'LONG')).toBe(0);
  });

  it('returns stable default inputs for game start', () => {
    const defaults = getDefaultInputs();

    expect(defaults.level).toBe(1);
    expect(defaults.leverage).toBe(5);
    expect(defaults.position).toBe(MarketPosition.LONG);
    expect(defaults.cycleDuration).toBeGreaterThan(0);
    expect(defaults.pnlHistory).toEqual([]);
    expect(defaults.macd.histogram).toBe(0);
    expect(defaults.stress.score).toBe(0);
  });
});
