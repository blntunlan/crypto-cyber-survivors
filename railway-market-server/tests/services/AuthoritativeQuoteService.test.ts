import { describe, expect, it } from 'vitest';
import { AuthoritativeQuoteService } from '../../src/services/economy/AuthoritativeQuoteService';

describe('AuthoritativeQuoteService', () => {
  it('issues a signed quote from server time and canonical price data', () => {
    const service = new AuthoritativeQuoteService('server-only-secret');

    const result = service.issue({
      sessionId: 'session-1',
      createdAtSeconds: 1_000,
      nowSeconds: 1_300,
      entryPrice: 100,
      canonicalPrice: 101,
      canonicalSequence: 42,
      position: 'LONG',
      leverage: 5,
      greedLevel: 0,
      pacingState: 'RECOVERY',
      marketStaleSeconds: 0,
      combatMastery: 0.5,
    });

    expect(result.quote.canonicalSequence).toBe(42);
    expect(result.quote.expiresAtSeconds).toBe(1_315);
    expect(result.signature).toMatch(/^[a-f0-9]{64}$/);
    expect(result.rewardPoints).toBeGreaterThan(0);
  });

  it('refuses a new quote while the market is stale or policy eligibility is unmet', () => {
    const service = new AuthoritativeQuoteService('server-only-secret');

    expect(() =>
      service.issue({
        sessionId: 'session-1',
        createdAtSeconds: 1_000,
        nowSeconds: 1_299,
        entryPrice: 100,
        canonicalPrice: 101,
        canonicalSequence: 42,
        position: 'LONG',
        leverage: 5,
        greedLevel: 0,
        pacingState: 'RECOVERY',
        marketStaleSeconds: 0,
        combatMastery: 0.5,
      })
    ).toThrow('CASH_OUT_NOT_ELIGIBLE');

    expect(() =>
      service.issue({
        sessionId: 'session-1',
        createdAtSeconds: 1_000,
        nowSeconds: 1_300,
        entryPrice: 100,
        canonicalPrice: 101,
        canonicalSequence: 42,
        position: 'LONG',
        leverage: 5,
        greedLevel: 0,
        pacingState: 'RECOVERY',
        marketStaleSeconds: 1,
        combatMastery: 0.5,
      })
    ).toThrow('CASH_OUT_NOT_ELIGIBLE');
  });

  it('issues a Safe Exit-only signed quote after sixty seconds of canonical market staleness', () => {
    const service = new AuthoritativeQuoteService('server-only-secret');

    const result = service.issue({
      sessionId: 'session-1',
      createdAtSeconds: 1_000,
      nowSeconds: 1_360,
      rewardElapsedSeconds: 300,
      entryPrice: 100,
      canonicalPrice: 101,
      canonicalSequence: 42,
      position: 'LONG',
      leverage: 5,
      greedLevel: 0,
      pacingState: 'DOOM',
      marketStaleSeconds: 60,
      combatMastery: 0.5,
    });

    expect(result.safeExitOnly).toBe(true);
    expect(result.quote.expiresAtSeconds - result.quote.issuedAtSeconds).toBe(15);
    expect(result.rewardPoints).toBeGreaterThan(0);
  });

  it('forces recovery with a signed quote after the forty-five second grace window', () => {
    const service = new AuthoritativeQuoteService('server-only-secret');

    const result = service.issue({
      sessionId: 'session-1',
      createdAtSeconds: 1_000,
      nowSeconds: 1_345,
      entryPrice: 100,
      canonicalPrice: 101,
      canonicalSequence: 42,
      position: 'LONG',
      leverage: 5,
      greedLevel: 0,
      pacingState: 'PEAK',
      marketStaleSeconds: 0,
      combatMastery: 0.5,
    });

    expect(result.shouldForceRecovery).toBe(true);
    expect(result.safeExitOnly).toBe(false);
  });
});
