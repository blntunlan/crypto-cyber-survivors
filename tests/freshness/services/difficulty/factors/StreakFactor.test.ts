import { describe, it, expect } from 'vitest';
import {
  calculateStreakFactor,
  getStreakTier,
  getKillsToNextThreshold,
} from '../../../../../services/difficulty/factors/StreakFactor';

describe('StreakFactor', () => {
  it('returns neutral factor when streak is inactive', () => {
    expect(calculateStreakFactor({ killStreak: 0, timeSinceLastKill: 200 })).toBe(1);
    expect(calculateStreakFactor({ killStreak: 20, timeSinceLastKill: 3501 })).toBe(1);
    expect(calculateStreakFactor({ killStreak: 20, timeSinceLastKill: -1 })).toBe(1);
  });

  it('adds bonus every 5 kills and caps at 1.3x', () => {
    expect(calculateStreakFactor({ killStreak: 4, timeSinceLastKill: 50 })).toBe(1);
    expect(calculateStreakFactor({ killStreak: 5, timeSinceLastKill: 50 })).toBe(1.05);
    expect(calculateStreakFactor({ killStreak: 25, timeSinceLastKill: 50 })).toBe(1.25);
    expect(calculateStreakFactor({ killStreak: 100, timeSinceLastKill: 50 })).toBe(1.3);
  });

  it('maps streaks to expected tiers', () => {
    expect(getStreakTier(0)).toBe('none');
    expect(getStreakTier(8)).toBe('hot');
    expect(getStreakTier(20)).toBe('blazing');
    expect(getStreakTier(40)).toBe('unstoppable');
    expect(getStreakTier(60)).toBe('godlike');
  });

  it('reports kills left to the next threshold', () => {
    expect(getKillsToNextThreshold(1)).toBe(4);
    expect(getKillsToNextThreshold(4)).toBe(1);
    expect(getKillsToNextThreshold(5)).toBe(5);
  });
});
