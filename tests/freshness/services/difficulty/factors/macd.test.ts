import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockGetState } = vi.hoisted(() => ({
  mockGetState: vi.fn(),
}));

vi.mock('../../../../../services/indicators/MarketIndicatorService', () => ({
  marketIndicatorService: {
    getState: mockGetState,
  },
}));

import {
  calculateMACDFactor,
  computeMACD,
} from '../../../../../services/difficulty/factors/macd';

describe('macd factor helpers', () => {
  beforeEach(() => {
    mockGetState.mockReset();
  });

  it('normalizes histogram with tanh squash', () => {
    mockGetState.mockReturnValue({
      macd: { histogram: 25, macd: 1.2, signal: 0.8 },
    });

    const factor = calculateMACDFactor();

    expect(factor).toBeCloseTo(Math.tanh(25 / 50), 8);
    expect(factor).toBeGreaterThan(0);
  });

  it('keeps output in [-1, 1] bounds', () => {
    mockGetState.mockReturnValue({
      macd: { histogram: -10_000, macd: -3.5, signal: -2.9 },
    });

    const factor = calculateMACDFactor();

    expect(factor).toBeGreaterThanOrEqual(-1);
    expect(factor).toBeLessThanOrEqual(1);
    expect(factor).toBeLessThan(0);
  });

  it('returns current raw macd values from indicator service', () => {
    mockGetState.mockReturnValue({
      macd: { histogram: 7.5, macd: 2.25, signal: 1.75 },
    });

    expect(computeMACD([100, 101, 102])).toEqual({
      histogram: 7.5,
      value: 2.25,
      signal: 1.75,
    });
  });
});
