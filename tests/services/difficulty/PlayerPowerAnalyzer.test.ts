import { describe, expect, it } from 'vitest';
import { createInitialPlayer } from '../../../config/PlayerConfig';
import { PlayerPowerAnalyzer } from '../../../services/difficulty/PlayerPowerAnalyzer';
import { type WeaponInstance } from '../../../types/weapons';

describe('PlayerPowerAnalyzer', () => {
  it('keeps baseline player pressure low', () => {
    const analyzer = new PlayerPowerAnalyzer();
    const player = createInitialPlayer(0, 0);

    const state = analyzer.updateFromValues(player, 4, 60, 0, [], 'flow');

    expect(state.playerPower).toBeLessThan(0.2);
    expect(state.counterPressure).toBe(0);
    expect(state.rangedPressure).toBe(0);
  });

  it('raises counter and ranged pressure for strong builds', () => {
    const analyzer = new PlayerPowerAnalyzer();
    const player = createInitialPlayer(0, 0);
    player.level = 18;
    player.baseDamage = 110;
    player.fireRate = 90;
    player.projectiles = 6;
    player.area = 2.4;
    player.critChance = 0.45;
    player.critDamage = 3;
    player.armor = 10;
    player.dodge = 0.3;
    player.regen = 4;

    const weapons: WeaponInstance[] = [
      { id: 'laser', level: 5, cooldownTimer: 0 },
      { id: 'aoe_nuke', level: 4, cooldownTimer: 0 },
    ];

    const state = analyzer.updateFromValues(player, 8, 80, 60, weapons, 'bored');

    expect(state.offensePower).toBeGreaterThan(0.55);
    expect(state.playerPower).toBeGreaterThan(0.55);
    expect(state.counterPressure).toBeGreaterThan(0.5);
    expect(state.rangedPressure).toBeGreaterThan(0.25);
  });

  it('reuses the same state object across updates', () => {
    const analyzer = new PlayerPowerAnalyzer();
    const player = createInitialPlayer(0, 0);

    const first = analyzer.updateFromValues(player, 0, 60, 0, [], 'flow');
    const second = analyzer.updateFromValues(player, 10, 60, 20, [], 'stressed');

    expect(second).toBe(first);
  });
});
