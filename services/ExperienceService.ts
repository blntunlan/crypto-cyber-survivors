/**
 * ExperienceService - Handles player level-up logic and EXP curve calculations.
 */

import { EXPERIENCE_CONFIG } from '../config/ExperienceConfig';

export class ExperienceService {
  /**
   * Calculates the total experience required to reach the NEXT level.
   * @param level Current level
   */
  static getRequiredExp(level: number): number {
    if (level < EXPERIENCE_CONFIG.PLATEAU_LEVEL) {
      // Early game: Power curve for satisfying progression
      // Level 1: 100 + floor(1^1.5 * 25) = 125
      // Level 10: 100 + floor(10^1.5 * 25) = 100 + 790 = 890
      return Math.floor(
        EXPERIENCE_CONFIG.BASE_EXP +
          Math.pow(level, EXPERIENCE_CONFIG.CURVE_EXPONENT) * 40
      );
    } else {
      // Mid-Late game: Switch to linear to keep it playable
      const plateauExp = Math.floor(
        EXPERIENCE_CONFIG.BASE_EXP +
          Math.pow(
            EXPERIENCE_CONFIG.PLATEAU_LEVEL - 1,
            EXPERIENCE_CONFIG.CURVE_EXPONENT
          ) *
            40
      );
      const levelsOverPlateau = level - (EXPERIENCE_CONFIG.PLATEAU_LEVEL - 1);
      return plateauExp + levelsOverPlateau * EXPERIENCE_CONFIG.LINEAR_STEP;
    }
  }

  /**
   * Check if player has leveled up and return remaining exp if so.
   */
  static checkLevelUp(
    currentExp: number,
    requiredExp: number
  ): { leveled: boolean; remainder: number } {
    if (currentExp >= requiredExp) {
      return { leveled: true, remainder: currentExp - requiredExp };
    }
    return { leveled: false, remainder: currentExp };
  }
}
