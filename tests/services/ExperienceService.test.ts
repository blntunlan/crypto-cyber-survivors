import { describe, it, expect } from 'vitest';
import { ExperienceService } from '../../services/gameplay/ExperienceService';
import { EXPERIENCE_CONFIG } from '../../config/ExperienceConfig';

describe('ExperienceService', () => {
  it('should return early-game discounted exp for level 1', () => {
    // Base formula: 600 + 1^1.55 * 120 = 720
    // Early game ramp at level 1: t=0, earlyMult=0.20 → 720 * 0.20 = 144
    expect(ExperienceService.getRequiredExp(1)).toBe(144);
  });

  it('should increase exp requirements for higher levels', () => {
    const lvl1 = ExperienceService.getRequiredExp(1);
    const lvl5 = ExperienceService.getRequiredExp(5);
    const lvl10 = ExperienceService.getRequiredExp(10);

    expect(lvl5).toBeGreaterThan(lvl1);
    expect(lvl10).toBeGreaterThan(lvl5);
  });

  it('should switch to linear scaling after plateau level', () => {
    const plateau = EXPERIENCE_CONFIG.PLATEAU_LEVEL; // 25
    const expAtPlateau = ExperienceService.getRequiredExp(plateau);
    const expAtPlateauPlus1 = ExperienceService.getRequiredExp(plateau + 1);

    const diff2 = expAtPlateauPlus1 - expAtPlateau;

    // After plateau, the difference should be exactly LINEAR_STEP
    expect(diff2).toBe(EXPERIENCE_CONFIG.LINEAR_STEP);
  });

  it('should handle level up check correctly', () => {
    const result = ExperienceService.checkLevelUp(150, 100);
    expect(result.leveled).toBe(true);
    expect(result.remainder).toBe(50);

    const result2 = ExperienceService.checkLevelUp(80, 100);
    expect(result2.leveled).toBe(false);
    expect(result2.remainder).toBe(80);
  });
});
