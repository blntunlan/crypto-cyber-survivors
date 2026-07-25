import { describe, expect, it } from 'vitest';
import { CashOutPolicy } from '../../src/services/economy/CashOutPolicy';

describe('CashOutPolicy', () => {
  it('issues an eligible fresh quote without client pacing input', () => {
    const policy = new CashOutPolicy();

    const result = policy.evaluate({
      elapsedSeconds: 300,
      lastDecisionAtSeconds: null,
      greedLevel: 0,
      marketStaleSeconds: 0,
    });

    expect(result.canIssueQuote).toBe(true);
    expect(result.quoteTtlSeconds).toBe(15);
  });

  it('allows the first quote only in recovery after five minutes', () => {
    const policy = new CashOutPolicy();

    expect(
      policy.evaluate({
        elapsedSeconds: 299,
        lastDecisionAtSeconds: null,
        greedLevel: 0,
        marketStaleSeconds: 0,
      }).canIssueQuote
    ).toBe(false);

    expect(
      policy.evaluate({
        elapsedSeconds: 300,
        lastDecisionAtSeconds: null,
        greedLevel: 0,
        marketStaleSeconds: 0,
      }).canIssueQuote
    ).toBe(true);
  });

  it('requests a recovery transition at 5:45 when the first quote is still pending', () => {
    const policy = new CashOutPolicy();

    const result = policy.evaluate({
      elapsedSeconds: 345,
      lastDecisionAtSeconds: null,
      greedLevel: 0,
      marketStaleSeconds: 0,
    });

    expect(result.canIssueQuote).toBe(true);
    expect(result.shouldForceRecovery).toBe(true);
  });

  it('uses the Greed-scaled interval after a rejection', () => {
    const policy = new CashOutPolicy();

    const result = policy.evaluate({
      elapsedSeconds: 570,
      lastDecisionAtSeconds: 300,
      greedLevel: 1,
      marketStaleSeconds: 0,
    });

    expect(result.nextEligibilitySeconds).toBe(270);
    expect(result.canIssueQuote).toBe(true);
  });

  it('freezes new quotes and unlocks Safe Exit after sixty stale seconds', () => {
    const policy = new CashOutPolicy();

    const result = policy.evaluate({
      elapsedSeconds: 600,
      lastDecisionAtSeconds: null,
      greedLevel: 0,
      marketStaleSeconds: 60,
    });

    expect(result.canIssueQuote).toBe(false);
    expect(result.safeExitAvailable).toBe(true);
    expect(result.shouldForceRecovery).toBe(false);
  });
});
