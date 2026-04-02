import { type SessionValidationInput, type ValidationFinding } from './types';

/** Max plausible kills per second of gameplay */
const MAX_KILLS_PER_SECOND = 5;

/** Min kills required per level (average) */
const MIN_KILLS_PER_LEVEL = 2;

/** Session duration limits */
const MIN_DURATION_SECONDS = 5;
const MAX_DURATION_SECONDS = 86_400; // 24 hours

/** Max plausible kill streak relative to total kills */
const MAX_STREAK_RATIO = 1.0;

/**
 * Validate field ranges for plausibility.
 * Pure function — no side effects.
 */
export function validateFieldRanges(
  input: SessionValidationInput
): ValidationFinding[] {
  const findings: ValidationFinding[] = [];

  // Duration validation
  if (input.survivalSeconds < MIN_DURATION_SECONDS) {
    findings.push({
      validator: 'duration',
      severity: 'fail',
      reason: `Session too short: ${input.survivalSeconds}s < ${MIN_DURATION_SECONDS}s minimum`,
      value: input.survivalSeconds,
      expected: { min: MIN_DURATION_SECONDS },
    });
  } else if (input.survivalSeconds > MAX_DURATION_SECONDS) {
    findings.push({
      validator: 'duration',
      severity: 'fail',
      reason: `Session too long: ${input.survivalSeconds}s > ${MAX_DURATION_SECONDS}s maximum`,
      value: input.survivalSeconds,
      expected: { max: MAX_DURATION_SECONDS },
    });
  }

  // Kill count plausibility
  if (input.kills < 0) {
    findings.push({
      validator: 'kills',
      severity: 'fail',
      reason: `Negative kill count: ${input.kills}`,
      value: input.kills,
      expected: { min: 0 },
    });
  } else if (input.survivalSeconds > 0) {
    const maxPlausibleKills = Math.ceil(input.survivalSeconds * MAX_KILLS_PER_SECOND);
    if (input.kills > maxPlausibleKills) {
      findings.push({
        validator: 'kills',
        severity: 'warn',
        reason: `Kill rate suspiciously high: ${input.kills} kills in ${input.survivalSeconds}s (max plausible: ${maxPlausibleKills})`,
        value: input.kills,
        expected: { max: maxPlausibleKills },
      });
    }
  }

  // Level vs kills consistency
  if (input.level > 1 && input.kills > 0) {
    const minKillsForLevel = (input.level - 1) * MIN_KILLS_PER_LEVEL;
    if (input.kills < minKillsForLevel) {
      findings.push({
        validator: 'level',
        severity: 'warn',
        reason: `Level ${input.level} with only ${input.kills} kills (expected at least ${minKillsForLevel})`,
        value: input.level,
        expected: { min: minKillsForLevel },
      });
    }
  }

  // PnL vs entry/exit price consistency
  if (input.entryPrice > 0 && input.exitPrice > 0 && input.leverage > 0) {
    const expectedPnl =
      ((input.exitPrice - input.entryPrice) / input.entryPrice) * input.leverage;
    const pnlDiff = Math.abs(input.pnlPercent - expectedPnl);
    // Allow 5% tolerance for rounding/timing
    if (pnlDiff > 0.05) {
      findings.push({
        validator: 'pnl',
        severity: 'warn',
        reason: `PnL mismatch: claimed ${(input.pnlPercent * 100).toFixed(1)}%, calculated ${(expectedPnl * 100).toFixed(1)}% (diff: ${(pnlDiff * 100).toFixed(1)}%)`,
        value: input.pnlPercent,
      });
    }
  }

  // Streak validation
  if (input.maxStreak > input.kills) {
    findings.push({
      validator: 'streak',
      severity: 'fail',
      reason: `Max streak (${input.maxStreak}) exceeds total kills (${input.kills})`,
      value: input.maxStreak,
      expected: { max: input.kills },
    });
  } else if (input.kills > 0 && input.maxStreak / input.kills > MAX_STREAK_RATIO) {
    findings.push({
      validator: 'streak',
      severity: 'warn',
      reason: `Streak ratio suspiciously high: ${input.maxStreak}/${input.kills}`,
      value: input.maxStreak,
    });
  }

  return findings;
}
