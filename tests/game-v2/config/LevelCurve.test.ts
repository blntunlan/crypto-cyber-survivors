import { describe, expect, it } from 'vitest';

import { MVP1_ABILITY_REGISTRY } from '@/game-v2/config/AbilityRegistry';
import {
  cumulativeXpForStepAbove,
  GRANTED_STARTING_WEAPON_PICKS,
  LEVEL_XP_STEP,
  levelXpThreshold,
  MVP1_FULL_BUILD_XP_COST,
  MVP1_MAX_PLAYER_LEVEL,
  MVP1_TOTAL_BUILD_PICKS,
} from '@/game-v2/config/LevelCurve';
import {
  CONVERGENCE_KILLS_TO_THRESHOLD,
  CONVERGENCE_THRESHOLD,
  ENEMY_XP_VALUE,
  LEVEL_2_XP_THRESHOLD,
  PLAYER_STARTING_LEVEL,
} from '@/game-v2/config/Mvp0Config';
import { MVP1_PASSIVE_REGISTRY } from '@/game-v2/config/PassiveRegistry';
import { ABILITY_MAX_TIER, ABILITY_SLOT_COUNT } from '@/game-v2/contracts/AbilitySlot';
import { PASSIVE_MAX_LEVEL, PASSIVE_SLOT_COUNT } from '@/game-v2/contracts/PassiveSlot';

describe('repeating level curve (V2-112)', () => {
  it('counts only picks the registries can actually offer', () => {
    // V2-ADR-080. A slot with no registered identity to put in it is not a
    // reachable pick, so slot capacity alone would overcount. MVP-1 registers
    // one passive identity; `V2-401` authors the other nine in MVP-4.
    expect(MVP1_PASSIVE_REGISTRY.size).toBeLessThan(PASSIVE_SLOT_COUNT);

    expect(MVP1_TOTAL_BUILD_PICKS).toBe(
      Math.min(ABILITY_SLOT_COUNT, MVP1_ABILITY_REGISTRY.size) * ABILITY_MAX_TIER -
        GRANTED_STARTING_WEAPON_PICKS +
        Math.min(PASSIVE_SLOT_COUNT, MVP1_PASSIVE_REGISTRY.size) * PASSIVE_MAX_LEVEL
    );

    // Independent literals, so a mutant that swaps the min() for slot capacity,
    // drops one term, or forgets the granted starting weapon is caught rather
    // than tracking the formula.
    expect(GRANTED_STARTING_WEAPON_PICKS).toBe(1);
    expect(MVP1_TOTAL_BUILD_PICKS).toBe(16);
    expect(MVP1_MAX_PLAYER_LEVEL).toBe(17);
    expect(MVP1_MAX_PLAYER_LEVEL).toBe(PLAYER_STARTING_LEVEL + MVP1_TOTAL_BUILD_PICKS);
  });

  it('keeps the first level-up at exactly one grunt kill', () => {
    // The curve is anchored on the existing first threshold, so every test
    // pinning "one kill, first level" survives unchanged.
    expect(levelXpThreshold(PLAYER_STARTING_LEVEL)).toBe(LEVEL_2_XP_THRESHOLD);
    expect(LEVEL_2_XP_THRESHOLD).toBe(ENEMY_XP_VALUE);
  });

  it('grows arithmetically by LEVEL_XP_STEP', () => {
    expect(levelXpThreshold(PLAYER_STARTING_LEVEL + 1)).toBe(
      LEVEL_2_XP_THRESHOLD + LEVEL_XP_STEP
    );
    expect(levelXpThreshold(MVP1_MAX_PLAYER_LEVEL - 1)).toBe(
      LEVEL_2_XP_THRESHOLD + LEVEL_XP_STEP * (MVP1_TOTAL_BUILD_PICKS - 1)
    );
  });

  it('rejects a level outside the curve', () => {
    // `MVP1_MAX_PLAYER_LEVEL` itself throws: a capped player has no next level.
    expect(() => levelXpThreshold(PLAYER_STARTING_LEVEL - 1)).toThrow(RangeError);
    expect(() => levelXpThreshold(MVP1_MAX_PLAYER_LEVEL)).toThrow(RangeError);
    expect(() => levelXpThreshold(1.5)).toThrow(RangeError);
    expect(() => levelXpThreshold(Number.NaN)).toThrow(RangeError);
  });

  it('completes a fully capped build inside the Convergence baseline', () => {
    // V2-109 (V2-ADR-072) fixes the cycle's XP budget at 2400 XP-equivalent
    // points, so the build must finish before the boss threshold arrives.
    expect(MVP1_FULL_BUILD_XP_COST).toBe(2360);
    expect(MVP1_FULL_BUILD_XP_COST).toBeLessThanOrEqual(CONVERGENCE_THRESHOLD);
    expect(MVP1_FULL_BUILD_XP_COST / ENEMY_XP_VALUE).toBeLessThanOrEqual(
      CONVERGENCE_KILLS_TO_THRESHOLD
    );
  });

  it('uses the largest integer step that still fits, so the step is forced', () => {
    // V2-ADR-082: this is what makes LEVEL_XP_STEP derived rather than tuned,
    // and it re-derives itself when `V2-401` grows the passive registry.
    expect(LEVEL_XP_STEP).toBe(19);
    expect(cumulativeXpForStepAbove()).toBe(2480);
    expect(cumulativeXpForStepAbove()).toBeGreaterThan(CONVERGENCE_THRESHOLD);
  });
});
