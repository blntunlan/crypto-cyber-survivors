import { describe, expect, it } from 'vitest';
import {
  convertPointsToTokens,
  getRemainingBudget,
  type EpochRate,
} from '../../src/services/economy/EpochRateService';

const createRate = (overrides: Partial<EpochRate> = {}): EpochRate => ({
  epochId: 'epoch-1',
  epochNumber: 1,
  economyVersion: 'economy-v1',
  tokensPerPoint: 0.01,
  perRunTokenCap: 5,
  tokenBudget: 1000,
  tokensIssued: 0,
  ...overrides,
});

describe('§14 points are priced by the epoch rate, never hardcoded', () => {
  it('converts reward points at the configured rate', () => {
    const conversion = convertPointsToTokens(250, createRate());

    expect(conversion.tokens).toBeCloseTo(2.5, 6);
    expect(conversion.uncappedTokens).toBeCloseTo(2.5, 6);
    expect(conversion.cappedBy).toBe('none');
  });

  it('clamps a single run at the per-run cap', () => {
    const conversion = convertPointsToTokens(10_000, createRate());

    expect(conversion.uncappedTokens).toBeCloseTo(100, 6);
    expect(conversion.tokens).toBe(5);
    expect(conversion.cappedBy).toBe('per_run_cap');
  });

  it('clamps again at whatever the epoch has left', () => {
    const conversion = convertPointsToTokens(
      10_000,
      createRate({ tokenBudget: 100, tokensIssued: 98 })
    );

    // The per-run cap alone would have paid 5; only 2 remain in the epoch.
    expect(conversion.tokens).toBeCloseTo(2, 6);
    expect(conversion.cappedBy).toBe('epoch_budget');
  });

  it('pays nothing once the epoch budget is spent', () => {
    const conversion = convertPointsToTokens(
      500,
      createRate({ tokenBudget: 100, tokensIssued: 100 })
    );

    expect(conversion.tokens).toBe(0);
    expect(conversion.cappedBy).toBe('epoch_exhausted');
    expect(conversion.remainingBudget).toBe(0);
  });

  it('never mints from negative or non-finite points', () => {
    // Garbage points must not buy tokens at all. Falling back to the per-run
    // cap would turn a corrupt number into the maximum payout.
    expect(convertPointsToTokens(-500, createRate()).tokens).toBe(0);
    expect(convertPointsToTokens(Number.NaN, createRate()).tokens).toBe(0);
    expect(convertPointsToTokens(Number.POSITIVE_INFINITY, createRate()).tokens).toBe(
      0
    );
  });

  it('treats an over-issued epoch as exhausted rather than negative', () => {
    const rate = createRate({ tokenBudget: 100, tokensIssued: 140 });

    expect(getRemainingBudget(rate)).toBe(0);
    expect(convertPointsToTokens(100, rate).tokens).toBe(0);
  });

  it('applies the per-run cap before the budget so caps compose predictably', () => {
    const conversion = convertPointsToTokens(
      10_000,
      createRate({ perRunTokenCap: 3, tokenBudget: 1000, tokensIssued: 0 })
    );

    expect(conversion.tokens).toBe(3);
    expect(conversion.cappedBy).toBe('per_run_cap');
  });
});
