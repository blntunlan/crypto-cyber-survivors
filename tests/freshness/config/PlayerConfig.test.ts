import { describe, it, expect } from 'vitest';
import {
  PLAYER_STATS,
  createInitialPlayer,
  PLAYER_INITIAL_HP,
  INITIAL_FIRE_RATE,
} from '../../../config/PlayerConfig';
import { EXPERIENCE_CONFIG } from '../../../config/ExperienceConfig';
import { STAT_DEFINITIONS } from '../../../config/StatRegistry';

describe('PlayerConfig', () => {
  it('mirrors defaults and caps from StatRegistry', () => {
    expect(PLAYER_STATS.INITIAL_DAMAGE).toBe(STAT_DEFINITIONS.baseDamage.defaultValue);
    expect(PLAYER_STATS.INITIAL_FIRE_RATE).toBe(STAT_DEFINITIONS.fireRate.defaultValue);
    expect(PLAYER_STATS.INITIAL_HP).toBe(STAT_DEFINITIONS.hp.defaultValue);
    expect(PLAYER_STATS.MAX_FIRE_RATE).toBe(STAT_DEFINITIONS.fireRate.cap);
    expect(PLAYER_STATS.MAX_SPEED).toBe(STAT_DEFINITIONS.speed.cap);
    expect(PLAYER_STATS.MAX_DODGE).toBe(STAT_DEFINITIONS.dodge.cap);
  });

  it('creates initial player with positional data and registry driven stats', () => {
    const player = createInitialPlayer(120, 240, '#ffffff');

    expect(player.x).toBe(120);
    expect(player.y).toBe(240);
    expect(player.radius).toBe(PLAYER_STATS.RADIUS);
    expect(player.color).toBe('#ffffff');
    expect(player.level).toBe(1);
    expect(player.exp).toBe(0);
    expect(player.nextLevelExp).toBe(EXPERIENCE_CONFIG.BASE_EXP);

    const playerStats = player as unknown as Record<string, number>;
    for (const stat of Object.values(STAT_DEFINITIONS)) {
      expect(playerStats[stat.id]).toBe(stat.defaultValue);
    }
  });

  it('keeps legacy exports aligned', () => {
    expect(PLAYER_INITIAL_HP).toBe(PLAYER_STATS.INITIAL_HP);
    expect(INITIAL_FIRE_RATE).toBe(PLAYER_STATS.INITIAL_FIRE_RATE);
  });
});
