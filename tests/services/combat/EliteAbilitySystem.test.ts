import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EliteAbilitySystem } from '../../../services/combat/EliteAbilitySystem';
import { EventBus } from '../../../services/core/EventBus';
import { type Enemy, type Player } from '../../../types';
import { type IPoolManager } from '../../../services/interfaces/IPoolManager';

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

function createPool(activeEnemies: Enemy[] = []): IPoolManager {
  return {
    activeEnemies,
    activeBullets: [],
    activeGems: [],
    activeParticles: [],
    activeFloatingTexts: [],
    activeSpeedLines: [],
    activeInteractables: [],
    getEnemy: vi.fn((x: number, y: number) => {
      const minion = createElite({
        active: true,
        isElite: false,
        eliteAbility: undefined,
        x,
        y,
        type: 'bear',
      });
      activeEnemies.push(minion);
      return minion;
    }),
  } as unknown as IPoolManager;
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
    const pool = createPool();
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
    const pool = createPool();
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

  it('spawns non-elite minions on death_split', () => {
    const emitSpy = vi.spyOn(EventBus, 'emit');
    const splitElite = createElite({
      eliteAbility: 'death_split',
      type: 'whale',
      maxHealth: 200,
      damage: 20,
    });
    const pool = createPool([splitElite]);

    system.onEliteDeath(splitElite, pool);

    const minions = pool.activeEnemies.filter(enemy => enemy !== splitElite);
    expect(minions).toHaveLength(2);
    expect(minions.every(minion => minion.type === 'bear')).toBe(true);
    expect(minions.every(minion => minion.isElite === false)).toBe(true);
    expect(minions.every(minion => minion.eliteAbility === undefined)).toBe(true);
    expect(minions.every(minion => minion.health === 60)).toBe(true);
    expect(emitSpy).toHaveBeenCalledWith(
      'eliteAbilityActivated',
      expect.objectContaining({ type: 'death_split' })
    );
  });

  it('damages nearby enemies on chain explosion without silent kills', () => {
    const emitSpy = vi.spyOn(EventBus, 'emit');
    const chainElite = createElite({
      eliteAbility: 'chain_explosion',
      type: 'liquidator',
    });
    const nearEnemy = createElite({ isElite: false, x: 40, health: 30 });
    const lethalEnemy = createElite({ isElite: false, x: 60, health: 5 });
    const farEnemy = createElite({ isElite: false, x: 240, health: 30 });
    const pool = createPool([chainElite, nearEnemy, lethalEnemy, farEnemy]);

    system.onEliteDeath(chainElite, pool);

    expect(nearEnemy.health).toBe(15);
    expect(lethalEnemy.health).toBe(1);
    expect(farEnemy.health).toBe(30);
    expect(emitSpy).toHaveBeenCalledWith(
      'eliteChainExplosion',
      expect.objectContaining({
        x: chainElite.x,
        y: chainElite.y,
        radius: expect.any(Number),
        damage: expect.any(Number),
        damagedCount: 2,
      })
    );
  });
});
