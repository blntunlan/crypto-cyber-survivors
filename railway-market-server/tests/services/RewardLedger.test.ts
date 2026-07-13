import { describe, expect, it } from 'vitest';
import { RewardLedger, ShardLedger } from '../../src/services/economy/RewardLedger';

describe('RewardLedger', () => {
  it('calculates primary points only from verified market and combat metrics', () => {
    const ledger = new RewardLedger();

    const result = ledger.calculate({
      survivalSeconds: 180,
      timeWeightedAlignment: 0.5,
      exitAlignment: 0.5,
      verifiedRiskQuality: 0.5,
      greedLevel: 1,
      combatMastery: 1,
    });

    expect(result.alignmentScore).toBeCloseTo(0.5);
    expect(result.rewardPoints).toBeCloseTo(111.3385, 3);
  });

  it('clamps untrusted-equivalent metric ranges before calculating points', () => {
    const ledger = new RewardLedger();

    const result = ledger.calculate({
      survivalSeconds: -100,
      timeWeightedAlignment: 99,
      exitAlignment: 99,
      verifiedRiskQuality: 99,
      greedLevel: -1,
      combatMastery: 99,
    });

    expect(result.rewardPoints).toBe(0);
    expect(result.directionFactor).toBe(1.25);
    expect(result.riskFactor).toBe(1.2);
  });

  it('allows primary settlement only for accepted quotes or stale Safe Exit', () => {
    const ledger = new RewardLedger();

    expect(ledger.canSettlePrimary('DEATH')).toBe(false);
    expect(ledger.canSettlePrimary('LIQUIDATION')).toBe(false);
    expect(ledger.canSettlePrimary('CASH_OUT_ACCEPTED')).toBe(true);
    expect(ledger.canSettlePrimary('SAFE_EXIT')).toBe(true);
  });
});

describe('ShardLedger', () => {
  it('awards survival tiers only to runs with verified combat participation', () => {
    const ledger = new ShardLedger();

    expect(ledger.calculate({ survivalSeconds: 180, hasCombatParticipation: true })).toBe(10);
    expect(ledger.calculate({ survivalSeconds: 1_800, hasCombatParticipation: true })).toBe(150);
    expect(ledger.calculate({ survivalSeconds: 18_000, hasCombatParticipation: true })).toBe(220);
    expect(ledger.calculate({ survivalSeconds: 1_800, hasCombatParticipation: false })).toBe(0);
  });
});
