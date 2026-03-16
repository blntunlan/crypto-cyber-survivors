/**
 * ExperienceService - Handles player level-up logic and EXP curve calculations.
 */

import { EXPERIENCE_CONFIG } from '../../config/ExperienceConfig';
import { getLeverageScale } from '../difficulty/constants';

export class ExperienceService {
  /**
   * Calculates the total experience required to reach the NEXT level.
   * @param level Current level
   * @param leverage Optional leverage to scale requirement (V2)
   */
  static getRequiredExp(level: number, leverage: number = 1): number {
    let baseExp = 0;

    if (level < EXPERIENCE_CONFIG.PLATEAU_LEVEL) {
      // Early game: Power curve for satisfying progression
      baseExp = Math.floor(
        EXPERIENCE_CONFIG.BASE_EXP +
          Math.pow(level, EXPERIENCE_CONFIG.CURVE_EXPONENT) *
            EXPERIENCE_CONFIG.SCALING_FACTOR
      );
    } else {
      // Mid-Late game: Switch to linear to keep it playable
      const plateauExp = Math.floor(
        EXPERIENCE_CONFIG.BASE_EXP +
          Math.pow(
            EXPERIENCE_CONFIG.PLATEAU_LEVEL - 1,
            EXPERIENCE_CONFIG.CURVE_EXPONENT
          ) *
            EXPERIENCE_CONFIG.SCALING_FACTOR
      );
      const levelsOverPlateau = level - (EXPERIENCE_CONFIG.PLATEAU_LEVEL - 1);
      baseExp = plateauExp + levelsOverPlateau * EXPERIENCE_CONFIG.LINEAR_STEP;
    }

    // Early game ramp: levels 1-(EARLY_END-1) need less XP to hook the player
    const { EARLY_END, EARLY_SCALE } = EXPERIENCE_CONFIG;
    if (level < EARLY_END) {
      const t = (level - 1) / (EARLY_END - 1); // 0 at level 1, 1 at EARLY_END-1
      const earlyMult = EARLY_SCALE + (1 - EARLY_SCALE) * t;
      baseExp = Math.floor(baseExp * earlyMult);
    }

    // Scale by leverage (V2)
    const scale = getLeverageScale(leverage);
    return Math.floor(baseExp * scale.xpReq);
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
