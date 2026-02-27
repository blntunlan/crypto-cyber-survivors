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

import type { DifficultyOutputV2 } from '../difficulty/types';

/**
 * Result of difficulty calculation for the engine to use.
 * Compatible with V1 and V2.
 */
export interface DifficultyOutput extends DifficultyOutputV2 {
  /** @deprecated Use enemyHP */
  enemyHealth: number;
  /** @deprecated Use gemDropRate */
  gemValueMultiplier: number;
  /** @deprecated Factors are now internal to Director */
  factors: DifficultyFactors;

  // V2 fields are inherited from DifficultyOutputV2
}
