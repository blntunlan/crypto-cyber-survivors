/**
 * Stress Score Calculator (Temporal)
 *
 * Calculates a composite "Stress Score" (0.0 - 1.0) representing how overwhelmed the player is.
 * Uses Temporal logic (Rate over time) rather than just instantaneous HP.
 */

const STRESS_WEIGHTS = {
  DAMAGE_RATE: 0.6, // High impact: Getting hit frequently is #1 stress indicator
  DASH_USAGE: 0.3, // Medium impact: Spamming dash means panic or kiting
  NEAR_DEATH: 0.1, // Low impact: Being low HP is stressful, but persistent low HP is 'managed risk'
};

const THRESHOLDS = {
  MAX_DAMAGE_RATE_HPM: 20, // 20 hits per minute considered "Maximum Panic"
  MAX_DASH_CPM: 15, // 15 dashes per minute considered "High Mobility / Panic"
  NEAR_DEATH_MAX_SEC: 10, // 10 seconds spent near death = Max stress contribution
};

interface StressInputs {
  damageTakenFrequency: number; // HPM (Hits Per Minute)
  dashUsageFrequency: number; // dashes per minute
  nearDeathDuration: number; // seconds
}

export function calculateStressScore(inputs: StressInputs): number {
  // 1. Normalize Components (Clamp 0-1)

  const damageScore = Math.min(
    1.0,
    inputs.damageTakenFrequency / THRESHOLDS.MAX_DAMAGE_RATE_HPM
  );
  const dashScore = Math.min(1.0, inputs.dashUsageFrequency / THRESHOLDS.MAX_DASH_CPM);
  const nearDeathScore = Math.min(
    1.0,
    inputs.nearDeathDuration / THRESHOLDS.NEAR_DEATH_MAX_SEC
  );

  // 2. Weighted Sum
  const totalStress =
    damageScore * STRESS_WEIGHTS.DAMAGE_RATE +
    dashScore * STRESS_WEIGHTS.DASH_USAGE +
    nearDeathScore * STRESS_WEIGHTS.NEAR_DEATH;

  return Math.min(1.0, Math.max(0.0, totalStress));
}
