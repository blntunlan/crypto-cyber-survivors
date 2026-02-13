import { describe, it, expect } from 'vitest';
import { calculateRSIFactor } from '../../../../../services/difficulty/factors/RSIFactor';
import { MarketPosition } from '../../../../../types';

describe('RSIFactor', () => {
  it('returns neutral multiplier for neutral RSI', () => {
    expect(
      calculateRSIFactor({
        rsiState: 'NEUTRAL',
        position: MarketPosition.LONG,
      })
    ).toBe(1);
  });

  it('rewards favorable reversal-aligned positions', () => {
    expect(
      calculateRSIFactor({ rsiState: 'OVERSOLD', position: MarketPosition.LONG })
    ).toBe(0.8);
    expect(
      calculateRSIFactor({ rsiState: 'OVERBOUGHT', position: MarketPosition.SHORT })
    ).toBe(0.8);
  });

  it('penalizes unfavorable FOMO positions', () => {
    expect(
      calculateRSIFactor({ rsiState: 'OVERBOUGHT', position: MarketPosition.LONG })
    ).toBe(1.35);
    expect(
      calculateRSIFactor({ rsiState: 'OVERSOLD', position: MarketPosition.SHORT })
    ).toBe(1.35);
  });
});
