import { describe, expect, it } from 'vitest';
import {
  calculateLeveragedRewardPnl,
  calculateRawPnlFromPrices,
} from '../../src/utils/trustedSessionMetrics';

describe('trustedSessionMetrics', () => {
  it('derives raw PnL from LONG and SHORT prices', () => {
    expect(calculateRawPnlFromPrices(100, 110, 'LONG')).toBeCloseTo(0.1);
    expect(calculateRawPnlFromPrices(100, 90, 'SHORT')).toBeCloseTo(0.1);
  });

  it('uses leveraged PnL for reward calculation while capping losses at liquidation', () => {
    expect(calculateLeveragedRewardPnl(0.01, 10)).toBeCloseTo(0.1);
    expect(calculateLeveragedRewardPnl(-0.02, 100)).toBe(-1);
  });
});
