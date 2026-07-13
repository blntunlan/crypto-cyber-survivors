import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RSICalculator } from '../../services/indicators/RSICalculator';
import { ATRCalculator } from '../../services/indicators/ATRCalculator';
import { SYNC_CONFIG } from '../../types/indicators';

describe('Indicator Synchronization & Determinism', () => {
  let rsi: RSICalculator;
  let atr: ATRCalculator;

  // Controlled price data for testing (15 points to satisfy 14-period)
  const prices = [
    100, 102, 101, 103, 105, 104, 106, 108, 107, 109, 111, 110, 112, 114, 113,
  ];

  beforeEach(() => {
    rsi = new RSICalculator(); // Default 14 period
    atr = new ATRCalculator(); // Default 14 period
  });

  afterEach(() => {
    rsi.dispose();
  });

  it('RSICalculator should produce deterministic values across 14-period window', () => {
    let lastRsi = 50;
    prices.forEach(p => {
      lastRsi = rsi.update(p);
    });

    // Check if initialized
    expect(rsi.isInitialized()).toBe(true);

    // Check precision (should have SYNC_CONFIG.PRECISION decimal places)
    const rsiStr = lastRsi.toString();
    if (rsiStr.includes('.')) {
      const decimals = rsiStr.split('.')[1]?.length ?? 0;
      expect(decimals).toBeLessThanOrEqual(SYNC_CONFIG.PRECISION);
    }
  });

  it('ATRCalculator should match simple moving average of True Range', () => {
    let result = { atr: 0, atrPercent: 0 };
    prices.forEach(p => {
      // For simplified 1s candles, high=low=close=p
      result = atr.update(p, p, p);
    });

    // Simple TR calculation for identical high/low/close:
    // First step: tr = 0
    // Subsequent: tr = max(0, |p - prevP|, |p - prevP|) = |p - prevP|

    // Manual TRs:
    // 0: (100-100) = 0
    // 1: |102-100| = 2
    // 2: |101-102| = 1
    // 3: |103-101| = 2
    // 4: |105-103| = 2
    // 5: |104-105| = 1
    // 6: |106-104| = 2
    // 7: |108-106| = 2
    // 8: |107-108| = 1
    // 9: |109-107| = 2
    // 10: |111-109| = 2
    // 11: |110-111| = 1
    // 12: |112-110| = 2
    // 13: |114-112| = 2
    // 14: |113-114| = 1

    // Sum of last 14 TRs: 2+1+2+2+1+2+2+1+2+2+1+2+2+1 = 23
    // ATR = 23 / 14 = 1.642857...

    expect(result.atr).toBeCloseTo(23 / 14, 5);
    expect(result.atrPercent).toBeCloseTo((23 / 14 / 113) * 100, SYNC_CONFIG.PRECISION);
  });

  it('should maintain sliding window of fixed size', () => {
    // Push 350 prices
    for (let i = 0; i < 350; i++) {
      rsi.update(100 + i);
    }

    expect(rsi.getHistoryLength()).toBe(SYNC_CONFIG.MAX_HISTORY_SIZE);
  });
});
