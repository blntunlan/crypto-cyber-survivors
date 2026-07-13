export type VerifiedRewardMetrics = {
  survivalSeconds: number;
  timeWeightedAlignment: number;
  exitAlignment: number;
  verifiedRiskQuality: number;
  greedLevel: number;
  combatMastery: number;
};

export type RewardPointBreakdown = {
  rewardPoints: number;
  alignmentScore: number;
  directionFactor: number;
  riskFactor: number;
  greedFactor: number;
  performanceFactor: number;
};

export type SettlementOutcome =
  | 'CASH_OUT_ACCEPTED'
  | 'SAFE_EXIT'
  | 'DEATH'
  | 'LIQUIDATION';

export type ShardInput = {
  survivalSeconds: number;
  hasCombatParticipation: boolean;
};

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));

export class RewardLedger {
  public calculate(metrics: VerifiedRewardMetrics): RewardPointBreakdown {
    const survivalSeconds = Math.max(0, metrics.survivalSeconds);
    const alignmentScore =
      0.8 * clamp(metrics.timeWeightedAlignment, -1, 1) +
      0.2 * clamp(metrics.exitAlignment, -1, 1);
    const directionFactor = clamp(1 + 0.25 * alignmentScore, 0.75, 1.25);
    const riskFactor = 1 + 0.2 * clamp(metrics.verifiedRiskQuality, 0, 1);
    const greedFactor = 1 + 0.18 * Math.sqrt(Math.max(0, metrics.greedLevel));
    const performanceFactor = 0.9 + 0.2 * clamp(metrics.combatMastery, 0, 1);
    const survivalPoints = 100 * Math.log(1 + survivalSeconds / 180);

    return {
      rewardPoints:
        survivalPoints * directionFactor * riskFactor * greedFactor * performanceFactor,
      alignmentScore,
      directionFactor,
      riskFactor,
      greedFactor,
      performanceFactor,
    };
  }

  public canSettlePrimary(outcome: SettlementOutcome): boolean {
    return outcome === 'CASH_OUT_ACCEPTED' || outcome === 'SAFE_EXIT';
  }
}

export class ShardLedger {
  public calculate(input: ShardInput): number {
    if (!input.hasCombatParticipation) return 0;

    const survivalSeconds = Math.max(0, input.survivalSeconds);
    if (survivalSeconds < 180) return 0;
    if (survivalSeconds < 360) return 10;
    if (survivalSeconds < 600) return 25;
    if (survivalSeconds < 900) return 50;
    if (survivalSeconds < 1_500) return 90;

    return Math.min(220, 140 + Math.floor((survivalSeconds - 1_500) / 300) * 10);
  }
}
