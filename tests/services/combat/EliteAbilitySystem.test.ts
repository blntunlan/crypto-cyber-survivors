import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EliteAbilitySystem } from '../../../services/combat/EliteAbilitySystem';
import { EventBus } from '../../../services/core/EventBus';
import { type Enemy, type Player } from '../../../types';
import { type IPoolManager } from '../../../services/interfaces/IPoolManager';

const pool = {} as IPoolManager;

const player = {
  x: 300,
  y: 0,
  hp: 100,
  maxHp: 100,
} as Player;

function createElite(overrides: Partial<Enemy>): Enemy {
  return {
    active: true,
    isDying: false,
    isElite: true,
    x: 0,
    y: 0,
    radius: 12,
    speed: 1,
    health: 100,
    maxHealth: 100,
    damage: 10,
    type: 'bear',
    eliteAbility: 'heal_aura',
    ...overrides,
  } as Enemy;
}

describe('EliteAbilitySystem', () => {
  let system: EliteAbilitySystem;

  beforeEach(() => {
    vi.restoreAllMocks();
    system = EliteAbilitySystem.getInstance();
    system.reset();
  });

  it('ticks heal aura and heals nearby enemies', () => {
    const emitSpy = vi.spyOn(EventBus, 'emit');
    const healer = createElite({ eliteAbility: 'heal_aura' });
    const damagedAlly = createElite({
      isElite: false,
      x: 40,
      health: 20,
      maxHealth: 60,
    });

    system.update(1, [healer], player, pool, [healer, damagedAlly]);

    expect(damagedAlly.health).toBe(25);
    expect(emitSpy).toHaveBeenCalledWith(
      'eliteAbilityActivated',
      expect.objectContaining({ type: 'heal_aura' })
    );
  });

  it('ticks phase teleport and moves elite toward the player', () => {
    const emitSpy = vi.spyOn(EventBus, 'emit');
    const phaseElite = createElite({
      eliteAbility: 'phase_teleport',
      type: 'fud',
      x: 0,
      y: 0,
    });

    system.update(3, [phaseElite], player, pool, [phaseElite]);

    expect(phaseElite.x).toBeGreaterThan(0);
    expect(phaseElite.x).toBeLessThanOrEqual(150);
    expect(emitSpy).toHaveBeenCalledWith(
      'eliteAbilityActivated',
      expect.objectContaining({ type: 'phase_teleport' })
    );
  });

  it('emits chain explosion on elite death', () => {
    const emitSpy = vi.spyOn(EventBus, 'emit');
    const chainElite = createElite({
      eliteAbility: 'chain_explosion',
      type: 'liquidator',
    });

    system.onEliteDeath(chainElite, pool);

    expect(emitSpy).toHaveBeenCalledWith(
      'eliteChainExplosion',
      expect.objectContaining({
        x: chainElite.x,
        y: chainElite.y,
        radius: expect.any(Number),
        damage: expect.any(Number),
      })
    );
  });
});
