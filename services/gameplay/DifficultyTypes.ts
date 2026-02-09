/**
 * Difficulty System Types
 */

export interface DifficultyFactors {
  baseTime: number;
  pnlEffect: number;
  volatility: number;
  levelFactor: number;
  waveMultiplier: number;
  nearDeathMod: number;
  streakBonus: number;
  momentumMod: number;
  cycleFactor: number;
  leverageDamage: number;
  leverageSpawn: number;
  leverageSpeed: number;
}

/**
 * Result of difficulty calculation for the engine to use.
 */
export interface DifficultyOutput {
  /** Enemy spawn rate multiplier */
  spawnRate: number;
  /** Enemy speed multiplier */
  enemySpeed: number;
  /** Enemy health multiplier */
  enemyHealth: number;
  /** Enemy damage multiplier */
  enemyDamage: number;
  /** Multiplier for gem XP/value (Reward scaling) */
  gemValueMultiplier: number;
  /** Combined raw difficulty value */
  total: number;
  /** Raw contributing factors for debugging/analytics */
  factors: DifficultyFactors;
}
