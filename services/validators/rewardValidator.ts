import { type SessionValidationInput, type ValidationFinding } from './types';
import {
  RewardCalculator,
  type ExitType,
  type PortalType,
} from '../gameplay/RewardCalculator';

/** Tolerance for client vs expected reward divergence */
const REWARD_DIVERGENCE_WARN_PERCENT = 0.1; // 10%
const REWARD_DIVERGENCE_FAIL_PERCENT = 0.5; // 50%

const calculator = new RewardCalculator();

/**
 * Validate that claimed rewards are within plausible range.
 * Uses shared RewardCalculator to compute expected values.
 */
export function validateReward(input: SessionValidationInput): ValidationFinding[] {
  const findings: ValidationFinding[] = [];

  if (input.totalCoins === undefined || input.totalCoins === 0) {
    // No reward claim to validate
    return findings;
  }

  // Compute expected reward using shared calculator
  const expected = calculator.calculate({
    survivalTimeSeconds: input.survivalSeconds,
    kills: input.kills,
    level: input.level,
    pnl: input.pnlPercent,
    maxStreak: input.maxStreak,
    exitType: input.exitType as ExitType | undefined,
    portalType: (input.exitType === 'portal'
      ? 'TAKE_PROFIT'
      : null) as PortalType | null,
  });

  // Check totalCoins vs expected
  if (expected.total > 0) {
    const divergence = Math.abs(input.totalCoins - expected.total) / expected.total;

    if (divergence > REWARD_DIVERGENCE_FAIL_PERCENT) {
      findings.push({
        validator: 'reward',
        severity: 'fail',
        reason: `Reward divergence too high: claimed ${input.totalCoins}, expected ~${expected.total} (${(divergence * 100).toFixed(0)}% off)`,
        value: input.totalCoins,
        expected: {
          min: 0,
          max: expected.total * (1 + REWARD_DIVERGENCE_FAIL_PERCENT),
        },
      });
    } else if (divergence > REWARD_DIVERGENCE_WARN_PERCENT) {
      findings.push({
        validator: 'reward',
        severity: 'warn',
        reason: `Reward divergence notable: claimed ${input.totalCoins}, expected ~${expected.total} (${(divergence * 100).toFixed(0)}% off)`,
        value: input.totalCoins,
      });
    }
  }

  // Check breakdown sums to total (if provided)
  if (input.breakdown && input.totalCoins > 0) {
    const breakdownSum = Object.values(input.breakdown).reduce((a, b) => a + b, 0);
    if (Math.abs(breakdownSum - input.totalCoins) > 1) {
      findings.push({
        validator: 'reward_breakdown',
        severity: 'warn',
        reason: `Breakdown sum (${breakdownSum}) doesn't match totalCoins (${input.totalCoins})`,
        value: breakdownSum,
        expected: { min: input.totalCoins, max: input.totalCoins },
      });
    }
  }

  return findings;
}
