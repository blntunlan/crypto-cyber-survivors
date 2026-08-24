import { describe, expect, it } from 'vitest';

import { ENEMY_XP_VALUE } from '@/game-v2/config/Mvp0Config';
import {
  MARKET_CONVERGENCE_BONUS_XP_PER_UNIT,
  WORLD_EVENT_CONVERGENCE_BONUS_UNITS,
} from '@/game-v2/config/MarketConvergenceBonus';

describe('MarketConvergenceBonus config', () => {
  it('anchors the per-unit bonus rate to ENEMY_XP_VALUE', () => {
    expect(MARKET_CONVERGENCE_BONUS_XP_PER_UNIT).toBe(ENEMY_XP_VALUE);
  });

  it('sets a flat one-unit bonus for a completed hazard', () => {
    expect(WORLD_EVENT_CONVERGENCE_BONUS_UNITS).toBe(1);
  });
});
