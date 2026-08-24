import { describe, expect, it } from 'vitest';

import { LEVERAGE_LETHALITY_PROFILES } from '@/game-v2/config/LethalityRegistry';
import { type CombatLethalityProfile } from '@/game-v2/contracts/CombatLethalityProfile';
import { EnemyAttackSystem } from '@/game-v2/systems/EnemyAttackSystem';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { World } from '@/game-v2/world/World';

const PLAYER_MASK =
  ComponentMask.Transform |
  ComponentMask.Body |
  ComponentMask.Health |
  ComponentMask.Player;
const ENEMY_MASK =
  ComponentMask.Transform |
  ComponentMask.Body |
  ComponentMask.Health |
  ComponentMask.Enemy;

const CHARGER = 1;
const BLOATER = 2;
const SNIPER = 3;

const PHASE_READY = 0;
const PHASE_TELEGRAPHING = 1;
const PHASE_ACTIVE = 2;
const PHASE_COOLDOWN = 3;

const healthOf = (world: World, slot: number): number => world.health[slot] ?? 0;

const setupWorld = (): { world: World; player: number; playerSlot: number } => {
  const world = new World(4);
  const player = world.createEntity(PLAYER_MASK);
  const playerSlot = world.slotOf(player);
  world.radius[playerSlot] = 0.5;
  world.health[playerSlot] = 100;
  world.maxHealth[playerSlot] = 100;
  return { world, player, playerSlot };
};

const spawnEnemy = (
  world: World,
  x: number,
  y: number,
  behavior: number,
  overrides: Partial<{
    radius: number;
    durationTicks: number;
    activeDurationTicks: number;
    cooldownTicks: number;
    effectDamage: number;
    effectRadius: number;
    effectRange: number;
    dashSpeed: number;
  }> = {}
): number => {
  const enemy = world.createEntity(ENEMY_MASK);
  const slot = world.slotOf(enemy);
  world.x[slot] = x;
  world.y[slot] = y;
  world.radius[slot] = overrides.radius ?? 0.6;
  world.health[slot] = 30;
  world.maxHealth[slot] = 30;
  world.enemyTelegraphBehavior[slot] = behavior;
  world.enemyTelegraphPhase[slot] = PHASE_READY;
  world.enemyTelegraphDurationTicks[slot] = overrides.durationTicks ?? 10;
  world.enemyTelegraphActiveDurationTicks[slot] = overrides.activeDurationTicks ?? 5;
  world.enemyTelegraphCooldownTicks[slot] = overrides.cooldownTicks ?? 20;
  world.enemyTelegraphEffectDamage[slot] = overrides.effectDamage ?? 12;
  world.enemyTelegraphEffectRadius[slot] = overrides.effectRadius ?? 1;
  world.enemyTelegraphEffectRange[slot] = overrides.effectRange ?? 5;
  world.enemyTelegraphDashSpeed[slot] = overrides.dashSpeed ?? 8;
  return slot;
};

describe('EnemyAttackSystem', () => {
  it('is a no-op for behavior NONE', () => {
    const { world, player } = setupWorld();
    const enemy = world.createEntity(ENEMY_MASK);
    const slot = world.slotOf(enemy);
    world.x[slot] = 1;
    world.y[slot] = 0;

    const system = new EnemyAttackSystem();
    for (let i = 0; i < 5; i += 1) {
      system.step(world, player);
    }

    expect(world.enemyTelegraphPhase[slot]).toBe(PHASE_READY);
  });

  describe('charger', () => {
    it('arms once within its trigger range, freezes during telegraph, then goes ACTIVE', () => {
      const { world, player } = setupWorld();
      const slot = spawnEnemy(world, 3, 0, CHARGER, {
        effectRange: 5,
        durationTicks: 3,
        activeDurationTicks: 2,
      });

      const system = new EnemyAttackSystem();
      system.step(world, player);
      expect(world.enemyTelegraphPhase[slot]).toBe(PHASE_TELEGRAPHING);
      expect(world.enemyTelegraphTicksRemaining[slot]).toBe(3);

      system.step(world, player);
      system.step(world, player);
      expect(world.enemyTelegraphPhase[slot]).toBe(PHASE_TELEGRAPHING);

      system.step(world, player);
      expect(world.enemyTelegraphPhase[slot]).toBe(PHASE_ACTIVE);
      expect(world.enemyTelegraphTicksRemaining[slot]).toBe(2);
    });

    it('does not arm outside its trigger range', () => {
      const { world, player } = setupWorld();
      const slot = spawnEnemy(world, 10, 0, CHARGER, { effectRange: 5 });

      new EnemyAttackSystem().step(world, player);

      expect(world.enemyTelegraphPhase[slot]).toBe(PHASE_READY);
    });

    it('never touches player health directly (the strike is ordinary contact damage)', () => {
      const { world, player, playerSlot } = setupWorld();
      spawnEnemy(world, 1, 0, CHARGER, {
        durationTicks: 1,
        activeDurationTicks: 1,
        effectRange: 5,
      });

      const system = new EnemyAttackSystem();
      const initialHealth = healthOf(world, playerSlot);
      for (let i = 0; i < 4; i += 1) {
        system.step(world, player);
      }

      expect(world.health[playerSlot]).toBe(initialHealth);
    });

    it('cycles ACTIVE -> COOLDOWN -> READY', () => {
      const { world, player } = setupWorld();
      const slot = spawnEnemy(world, 1, 0, CHARGER, {
        durationTicks: 1,
        activeDurationTicks: 1,
        cooldownTicks: 2,
        effectRange: 5,
      });

      const system = new EnemyAttackSystem();
      system.step(world, player); // arm -> TELEGRAPHING
      system.step(world, player); // resolve -> ACTIVE
      expect(world.enemyTelegraphPhase[slot]).toBe(PHASE_ACTIVE);

      system.step(world, player); // ACTIVE -> COOLDOWN
      expect(world.enemyTelegraphPhase[slot]).toBe(PHASE_COOLDOWN);
      expect(world.enemyTelegraphTicksRemaining[slot]).toBe(2);

      system.step(world, player);
      expect(world.enemyTelegraphPhase[slot]).toBe(PHASE_COOLDOWN);
      system.step(world, player);
      expect(world.enemyTelegraphPhase[slot]).toBe(PHASE_READY);
    });
  });

  describe('bloater', () => {
    it('arms on contact-range overlap, then applies burst damage and destroys itself', () => {
      const { world, player, playerSlot } = setupWorld();
      const slot = spawnEnemy(world, 0.5, 0, BLOATER, {
        radius: 0.3,
        durationTicks: 2,
        effectDamage: 20,
        effectRadius: 3,
      });
      world.radius[playerSlot] = 0.5;

      const system = new EnemyAttackSystem();
      system.step(world, player); // within playerRadius+enemyRadius (0.8) of distance 0.5 -> arms
      expect(world.enemyTelegraphPhase[slot]).toBe(PHASE_TELEGRAPHING);

      const beforeHealth = healthOf(world, playerSlot);
      system.step(world, player);
      system.step(world, player); // resolves: player still at distance 0.5, well within burst radius 3

      expect(world.health[playerSlot]).toBeLessThan(beforeHealth);
      expect(world.isAlive(world.entityIdOf(slot))).toBe(false);
    });

    it('destroys itself even when the player escaped the burst radius during the fuse', () => {
      const { world, player, playerSlot } = setupWorld();
      const slot = spawnEnemy(world, 0.5, 0, BLOATER, {
        radius: 0.3,
        durationTicks: 2,
        effectDamage: 20,
        effectRadius: 1,
      });

      const system = new EnemyAttackSystem();
      system.step(world, player);
      // Player retreats far outside the burst radius before the fuse ends.
      world.x[playerSlot] = 50;

      const beforeHealth = healthOf(world, playerSlot);
      system.step(world, player);
      system.step(world, player);

      expect(world.health[playerSlot]).toBe(beforeHealth);
      expect(world.isAlive(world.entityIdOf(slot))).toBe(false);
    });
  });

  describe('sniper', () => {
    it('locks its aim at telegraph-start: a hit if the player stays on the line', () => {
      const { world, player, playerSlot } = setupWorld();
      const slot = spawnEnemy(world, 0, 0, SNIPER, {
        durationTicks: 3,
        activeDurationTicks: 2,
        effectRange: 10,
        effectRadius: 0.5,
        effectDamage: 15,
      });
      world.x[playerSlot] = 5;
      world.y[playerSlot] = 0;

      const system = new EnemyAttackSystem();
      system.step(world, player);
      expect(world.enemyTelegraphPhase[slot]).toBe(PHASE_TELEGRAPHING);
      expect(world.enemyTelegraphAimX[slot]).toBeCloseTo(1);
      expect(world.enemyTelegraphAimY[slot]).toBeCloseTo(0);

      const beforeHealth = healthOf(world, playerSlot);
      // durationTicks (3) more calls are needed after the arm call to
      // resolve, matching this project's own "N ticks after arm, N+1
      // total calls" tick-math convention.
      system.step(world, player);
      system.step(world, player);
      system.step(world, player);

      expect(world.health[playerSlot]).toBeLessThan(beforeHealth);
      expect(world.enemyTelegraphPhase[slot]).toBe(PHASE_ACTIVE);
    });

    it('misses if the player moves off the locked line during the telegraph', () => {
      const { world, player, playerSlot } = setupWorld();
      const slot = spawnEnemy(world, 0, 0, SNIPER, {
        durationTicks: 3,
        activeDurationTicks: 2,
        effectRange: 10,
        effectRadius: 0.5,
        effectDamage: 15,
      });
      world.x[playerSlot] = 5;
      world.y[playerSlot] = 0;

      const system = new EnemyAttackSystem();
      system.step(world, player); // aim locks pointing along +X

      // The player sidesteps well clear of the tolerance band.
      world.y[playerSlot] = 5;

      const beforeHealth = healthOf(world, playerSlot);
      system.step(world, player);
      system.step(world, player);
      system.step(world, player);

      expect(world.health[playerSlot]).toBe(beforeHealth);
      expect(world.enemyTelegraphPhase[slot]).toBe(PHASE_ACTIVE);
    });

    it('misses beyond its own line range', () => {
      const { world, player, playerSlot } = setupWorld();
      spawnEnemy(world, 0, 0, SNIPER, {
        durationTicks: 1,
        activeDurationTicks: 1,
        effectRange: 3,
        effectRadius: 0.5,
        effectDamage: 15,
      });
      world.x[playerSlot] = 2.9;
      world.y[playerSlot] = 0;

      const system = new EnemyAttackSystem();
      system.step(world, player); // locks aim toward x=2.9, within range 3

      // Player retreats beyond the line's max range before resolution.
      world.x[playerSlot] = 20;

      const beforeHealth = healthOf(world, playerSlot);
      system.step(world, player);

      expect(world.health[playerSlot]).toBe(beforeHealth);
    });
  });

  describe('damage composition', () => {
    it('routes bloater/sniper damage through the injected lethality profile, not raw damage', () => {
      const halvingProfile: CombatLethalityProfile = {
        ...LEVERAGE_LETHALITY_PROFILES[1],
        enemyDamageMultiplier: 0.5,
        playerArmor: 0,
      };
      const { world, player, playerSlot } = setupWorld();
      spawnEnemy(world, 0.5, 0, BLOATER, {
        radius: 0.3,
        durationTicks: 1,
        effectDamage: 20,
        effectRadius: 3,
      });

      const system = new EnemyAttackSystem(halvingProfile);
      const beforeHealth = healthOf(world, playerSlot);
      system.step(world, player);
      system.step(world, player);

      expect(beforeHealth - (world.health[playerSlot] ?? 0)).toBeCloseTo(10);
    });
  });

  it('rejects a player entity missing the required components', () => {
    const world = new World(4);
    const nonPlayer = world.createEntity(ComponentMask.Transform);

    expect(() => new EnemyAttackSystem().step(world, nonPlayer)).toThrow(RangeError);
  });
});
