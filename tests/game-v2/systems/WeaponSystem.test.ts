import { describe, expect, it } from 'vitest';

import { STARTER_PROJECTILE } from '@/game-v2/config/AbilityRegistry';
import { AbilityLoadoutSystem } from '@/game-v2/systems/AbilityLoadoutSystem';
import {
  ENEMY_FACTION,
  ENEMY_HEALTH,
  ENEMY_RADIUS,
  PROJECTILE_DAMAGE,
  PROJECTILE_LIFETIME_SECONDS,
  PROJECTILE_LIFETIME_TICKS,
  PROJECTILE_RADIUS,
  PROJECTILE_SPEED,
  SIMULATION_HZ,
  STARTER_PROJECTILE_RADIUS_TIER_3,
  STARTER_WEAPON_COOLDOWN_TICKS_TIER_3,
  STARTER_WEAPON_DAMAGE_TIER_2,
  WEAPON_COOLDOWN_SECONDS,
  WEAPON_COOLDOWN_TICKS,
} from '@/game-v2/config/Mvp0Config';
import { type EntityId } from '@/game-v2/contracts/EntityId';
import { type StepContext } from '@/game-v2/contracts/StepContext';
import { WeaponSystem } from '@/game-v2/systems/WeaponSystem';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { World } from '@/game-v2/world/World';

const PLAYER_MASK =
  ComponentMask.Transform |
  ComponentMask.Velocity |
  ComponentMask.Health |
  ComponentMask.Player |
  ComponentMask.AbilityLoadout;
const PLAYER_HEALTH = 100;
const ENEMY_MASK =
  ComponentMask.Transform |
  ComponentMask.Velocity |
  ComponentMask.Body |
  ComponentMask.Health |
  ComponentMask.Faction |
  ComponentMask.Enemy;
const PROJECTILE_MASK =
  ComponentMask.Transform |
  ComponentMask.Velocity |
  ComponentMask.Body |
  ComponentMask.Projectile;
const FIXED_DELTA_SECONDS = 1 / SIMULATION_HZ;

const context = (tick: number): StepContext => ({
  tick,
  deltaSeconds: FIXED_DELTA_SECONDS,
  intent: { moveX: 0, moveY: 0, dashPressed: false },
});

const createPlayer = (world: World, x = 0, y = 0): EntityId => {
  const player = world.createEntity(PLAYER_MASK);
  const slot = world.slotOf(player);
  world.x[slot] = x;
  world.y[slot] = y;
  world.previousX[slot] = x;
  world.previousY[slot] = y;
  world.health[slot] = PLAYER_HEALTH;
  world.maxHealth[slot] = PLAYER_HEALTH;
  return player;
};

const createEnemy = (world: World, x: number, y: number): EntityId => {
  const enemy = world.createEntity(ENEMY_MASK);
  const slot = world.slotOf(enemy);
  world.x[slot] = x;
  world.y[slot] = y;
  world.previousX[slot] = x;
  world.previousY[slot] = y;
  world.radius[slot] = ENEMY_RADIUS;
  world.health[slot] = ENEMY_HEALTH;
  world.maxHealth[slot] = ENEMY_HEALTH;
  world.faction[slot] = ENEMY_FACTION;
  return enemy;
};

const projectileSlots = (world: World): number[] => {
  const slots: number[] = [];
  for (let slot = 0; slot < world.masks.length; slot += 1) {
    const mask = world.masks[slot] ?? 0;
    if ((mask & PROJECTILE_MASK) === PROJECTILE_MASK) {
      slots.push(slot);
    }
  }
  return slots;
};

const firedProjectileSlot = (world: World): number => {
  for (let slot = 0; slot < world.masks.length; slot += 1) {
    const mask = world.masks[slot] ?? 0;
    if (
      (mask & PROJECTILE_MASK) === PROJECTILE_MASK &&
      world.projectileLifetimeTicksRemaining[slot] === PROJECTILE_LIFETIME_TICKS
    ) {
      return slot;
    }
  }
  return -1;
};

const worldState = (world: World): unknown => ({
  activeCount: world.activeCount,
  freeSlotCount: world.freeSlotCount,
  masks: [...world.masks],
  generations: [...world.generations],
  freeSlots: [...world.freeSlots],
  x: [...world.x],
  y: [...world.y],
  previousX: [...world.previousX],
  previousY: [...world.previousY],
  velocityX: [...world.velocityX],
  velocityY: [...world.velocityY],
  radius: [...world.radius],
  health: [...world.health],
  lastFacingX: [...world.lastFacingX],
  lastFacingY: [...world.lastFacingY],
  weaponCooldownTicksRemaining: [...world.weaponCooldownTicksRemaining],
  abilitySlotIdentity: [...world.abilitySlotIdentity],
  abilitySlotTier: [...world.abilitySlotTier],
  projectileDamage: [...world.projectileDamage],
  projectileLifetimeTicksRemaining: [...world.projectileLifetimeTicksRemaining],
});

describe('WeaponSystem config', () => {
  it('derives integer tick budgets from authored seconds', () => {
    expect(WEAPON_COOLDOWN_SECONDS).toBe(0.5);
    expect(PROJECTILE_LIFETIME_SECONDS).toBe(1.5);
    expect(PROJECTILE_SPEED).toBe(14);
    expect(PROJECTILE_DAMAGE).toBe(10);
    expect(WEAPON_COOLDOWN_TICKS).toBe(
      Math.ceil(WEAPON_COOLDOWN_SECONDS * SIMULATION_HZ)
    );
    expect(PROJECTILE_LIFETIME_TICKS).toBe(
      Math.ceil(PROJECTILE_LIFETIME_SECONDS * SIMULATION_HZ)
    );
    expect(WEAPON_COOLDOWN_TICKS).toBe(30);
    expect(PROJECTILE_LIFETIME_TICKS).toBe(90);
    expect(PROJECTILE_RADIUS).toBeGreaterThan(0);
    expect(PROJECTILE_RADIUS).toBeLessThan(ENEMY_RADIUS);
    expect(PROJECTILE_SPEED * FIXED_DELTA_SECONDS).toBeLessThan(
      2 * (PROJECTILE_RADIUS + ENEMY_RADIUS)
    );
  });
});

describe('WeaponSystem', () => {
  it('initializes weapon state through resetPlayer', () => {
    const world = new World(4);
    const player = createPlayer(world);
    const slot = world.slotOf(player);
    world.weaponCooldownTicksRemaining[slot] = 17;
    const weapon = new WeaponSystem();
    const loadout = new AbilityLoadoutSystem();

    weapon.resetPlayer(world, player);

    expect(world.weaponCooldownTicksRemaining[slot]).toBe(0);
    expect(loadout.identityAt(world, player, 0)).toBe(STARTER_PROJECTILE.id);
    expect(loadout.tierAt(world, player, 0)).toBe(1);
    expect(loadout.occupiedCount(world, player)).toBe(1);
    expect(weapon.starterDamageOf(world, player)).toBe(PROJECTILE_DAMAGE);
  });

  it('rebuilds the loadout from scratch on a second resetPlayer', () => {
    const world = new World(4);
    const player = createPlayer(world);
    const weapon = new WeaponSystem();
    const loadout = new AbilityLoadoutSystem();

    weapon.resetPlayer(world, player);
    weapon.advanceStarterTier(world, player);
    weapon.resetPlayer(world, player);

    expect(loadout.tierAt(world, player, 0)).toBe(1);
    expect(loadout.occupiedCount(world, player)).toBe(1);
  });

  it('advances the starter weapon through all three tiers and then refuses', () => {
    const world = new World(4);
    const player = createPlayer(world);
    const weapon = new WeaponSystem();

    weapon.resetPlayer(world, player);

    expect(weapon.advanceStarterTier(world, player)).toBe(2);
    expect(weapon.starterDamageOf(world, player)).toBe(STARTER_WEAPON_DAMAGE_TIER_2);

    expect(weapon.advanceStarterTier(world, player)).toBe(3);
    expect(weapon.starterDamageOf(world, player)).toBe(STARTER_WEAPON_DAMAGE_TIER_2);

    expect(() => weapon.advanceStarterTier(world, player)).toThrow(
      'ability has no authored tier above 3'
    );
  });

  it('refuses to fire a tier byte beyond what the identity authored', () => {
    const world = new World(4);
    const player = createPlayer(world);
    createEnemy(world, 3, 0);
    const weapon = new WeaponSystem();

    weapon.resetPlayer(world, player);
    world.abilitySlotTier[world.abilitySlotIndexOf(world.slotOf(player), 0)] = 4;

    expect(() => weapon.starterDamageOf(world, player)).toThrow(
      'ability slot tier has no authored effect'
    );
    expect(() => weapon.step(world, player, context(0))).toThrow(
      'ability slot tier has no authored effect'
    );
  });

  it('refuses to fire without a starter weapon in the loadout', () => {
    const world = new World(4);
    const player = createPlayer(world);
    const weapon = new WeaponSystem();
    const loadout = new AbilityLoadoutSystem();

    weapon.resetPlayer(world, player);
    loadout.remove(world, player, 0);

    expect(() => weapon.step(world, player, context(0))).toThrow(
      'player holds no starter weapon'
    );
    expect(() => weapon.advanceStarterTier(world, player)).toThrow(
      'player holds no starter weapon'
    );
  });

  it('fires at ticks 0, 30, 60 and 90 across 120 ticks', () => {
    const world = new World(8);
    const player = createPlayer(world, 0, 0);
    createEnemy(world, 3, 4);
    const weapon = new WeaponSystem();
    weapon.resetPlayer(world, player);
    const firedTicks: number[] = [];

    for (let tick = 0; tick < 120; tick += 1) {
      weapon.step(world, player, context(tick));
      if (firedProjectileSlot(world) >= 0) {
        firedTicks.push(tick);
      }
    }

    expect(firedTicks).toEqual([0, 30, 60, 90]);
  });

  it('fully initializes a fired projectile from the player position', () => {
    const world = new World(8);
    const player = createPlayer(world, 2, -1);
    createEnemy(world, 5, 3);
    const weapon = new WeaponSystem();
    weapon.resetPlayer(world, player);

    weapon.step(world, player, context(0));
    const slots = projectileSlots(world);

    expect(slots).toHaveLength(1);
    const slot = slots[0] as number;
    expect(world.masks[slot]).toBe(PROJECTILE_MASK);
    expect(world.x[slot]).toBe(2);
    expect(world.y[slot]).toBe(-1);
    expect(world.previousX[slot]).toBe(2);
    expect(world.previousY[slot]).toBe(-1);
    expect(world.radius[slot]).toBeCloseTo(PROJECTILE_RADIUS, 6);
    expect(world.projectileDamage[slot]).toBe(PROJECTILE_DAMAGE);
    expect(world.projectileLifetimeTicksRemaining[slot]).toBe(
      PROJECTILE_LIFETIME_TICKS
    );
    expect(world.velocityX[slot]).toBeCloseTo(PROJECTILE_SPEED * 0.6, 4);
    expect(world.velocityY[slot]).toBeCloseTo(PROJECTILE_SPEED * 0.8, 4);
  });

  it('normalizes projectile velocity toward the selected enemy', () => {
    const world = new World(8);
    const player = createPlayer(world, 0, 0);
    createEnemy(world, -6, 8);
    const weapon = new WeaponSystem();
    weapon.resetPlayer(world, player);

    weapon.step(world, player, context(0));
    const slot = projectileSlots(world)[0] as number;
    const velocityX = world.velocityX[slot] ?? 0;
    const velocityY = world.velocityY[slot] ?? 0;

    expect(Math.hypot(velocityX, velocityY)).toBeCloseTo(PROJECTILE_SPEED, 4);
    expect(velocityX).toBeCloseTo(PROJECTILE_SPEED * -0.6, 4);
    expect(velocityY).toBeCloseTo(PROJECTILE_SPEED * 0.8, 4);
  });

  it('carries the tier damage the loadout currently holds into the projectile', () => {
    const world = new World(8);
    const player = createPlayer(world, 0, 0);
    createEnemy(world, 4, 0);
    const weapon = new WeaponSystem();
    weapon.resetPlayer(world, player);
    weapon.advanceStarterTier(world, player);

    weapon.step(world, player, context(0));
    const slot = projectileSlots(world)[0] as number;

    expect(world.projectileDamage[slot]).toBe(STARTER_WEAPON_DAMAGE_TIER_2);
  });

  it('fires Tier 3 with its own wider radius and shorter cooldown, damage unchanged', () => {
    const world = new World(8);
    const player = createPlayer(world, 0, 0);
    const playerSlot = world.slotOf(player);
    createEnemy(world, 4, 0);
    const weapon = new WeaponSystem();
    weapon.resetPlayer(world, player);
    weapon.advanceStarterTier(world, player);
    weapon.advanceStarterTier(world, player);

    expect(weapon.starterDamageOf(world, player)).toBe(STARTER_WEAPON_DAMAGE_TIER_2);

    weapon.step(world, player, context(0));
    const slot = projectileSlots(world)[0] as number;

    expect(world.projectileDamage[slot]).toBe(STARTER_WEAPON_DAMAGE_TIER_2);
    expect(world.radius[slot]).toBeCloseTo(STARTER_PROJECTILE_RADIUS_TIER_3, 6);
    expect(world.radius[slot]).toBeGreaterThan(PROJECTILE_RADIUS);
    expect(world.weaponCooldownTicksRemaining[playerSlot]).toBe(
      STARTER_WEAPON_COOLDOWN_TICKS_TIER_3
    );
    expect(STARTER_WEAPON_COOLDOWN_TICKS_TIER_3).toBeLessThan(WEAPON_COOLDOWN_TICKS);
  });

  it('creates no projectile without a target and stays ready to fire', () => {
    const world = new World(8);
    const player = createPlayer(world, 0, 0);
    const playerSlot = world.slotOf(player);
    const weapon = new WeaponSystem();
    weapon.resetPlayer(world, player);

    for (let tick = 0; tick < 100; tick += 1) {
      weapon.step(world, player, context(tick));
      expect(projectileSlots(world)).toHaveLength(0);
      expect(world.weaponCooldownTicksRemaining[playerSlot]).toBe(0);
    }

    createEnemy(world, 2, 0);
    weapon.step(world, player, context(100));

    expect(projectileSlots(world)).toHaveLength(1);
    expect(world.weaponCooldownTicksRemaining[playerSlot]).toBe(WEAPON_COOLDOWN_TICKS);
  });

  it('refuses to fire without a free slot and makes no partial mutation', () => {
    const world = new World(4);
    const player = createPlayer(world, 0, 0);
    createEnemy(world, 3, 0);
    world.createEntity(ComponentMask.Body);
    world.createEntity(ComponentMask.Body);
    const weapon = new WeaponSystem();
    weapon.resetPlayer(world, player);
    const before = worldState(world);

    expect(world.freeSlotCount).toBe(0);
    expect(() => weapon.step(world, player, context(0))).toThrow(RangeError);
    expect(worldState(world)).toEqual(before);
  });

  it('refuses an exhausted world before advancing any live projectile', () => {
    const world = new World(5);
    const player = createPlayer(world, 0, 0);
    const playerSlot = world.slotOf(player);
    createEnemy(world, 3, 4);
    const weapon = new WeaponSystem();
    weapon.resetPlayer(world, player);

    weapon.step(world, player, context(0));
    expect(projectileSlots(world)).toHaveLength(1);

    world.createEntity(ComponentMask.Body);
    world.createEntity(ComponentMask.Body);
    world.weaponCooldownTicksRemaining[playerSlot] = 0;

    expect(world.freeSlotCount).toBe(0);
    const before = worldState(world);

    expect(() => weapon.step(world, player, context(1))).toThrow(RangeError);
    expect(worldState(world)).toEqual(before);
  });

  it('does not throw on an exhausted world when no target exists', () => {
    const world = new World(3);
    const player = createPlayer(world, 0, 0);
    world.createEntity(ComponentMask.Body);
    world.createEntity(ComponentMask.Body);
    const weapon = new WeaponSystem();
    weapon.resetPlayer(world, player);

    expect(world.freeSlotCount).toBe(0);
    expect(() => weapon.step(world, player, context(0))).not.toThrow();
    expect(world.weaponCooldownTicksRemaining[world.slotOf(player)]).toBe(0);
  });

  it.each([
    [0, 1, PROJECTILE_SPEED * 0, PROJECTILE_SPEED * 1],
    [3, 4, PROJECTILE_SPEED * 0.6, PROJECTILE_SPEED * 0.8],
    [0, 0, PROJECTILE_SPEED, 0],
  ])(
    'produces finite velocity for a zero-distance target with facing (%s, %s)',
    (facingX, facingY, expectedX, expectedY) => {
      const world = new World(8);
      const player = createPlayer(world, 5, -5);
      const playerSlot = world.slotOf(player);
      world.lastFacingX[playerSlot] = facingX;
      world.lastFacingY[playerSlot] = facingY;
      createEnemy(world, 5, -5);
      const weapon = new WeaponSystem();
      weapon.resetPlayer(world, player);

      weapon.step(world, player, context(0));
      const slot = projectileSlots(world)[0] as number;
      const velocityX = world.velocityX[slot] ?? Number.NaN;
      const velocityY = world.velocityY[slot] ?? Number.NaN;

      expect(Number.isFinite(velocityX)).toBe(true);
      expect(Number.isFinite(velocityY)).toBe(true);
      expect(Math.hypot(velocityX, velocityY)).toBeCloseTo(PROJECTILE_SPEED, 4);
      expect(velocityX).toBeCloseTo(expectedX, 4);
      expect(velocityY).toBeCloseTo(expectedY, 4);
    }
  );

  it('captures the previous projectile position before integrating', () => {
    const world = new World(8);
    const player = createPlayer(world, 0, 0);
    createEnemy(world, 3, 4);
    const weapon = new WeaponSystem();
    weapon.resetPlayer(world, player);

    weapon.step(world, player, context(0));
    const slot = projectileSlots(world)[0] as number;
    const velocityX = world.velocityX[slot] ?? 0;
    const velocityY = world.velocityY[slot] ?? 0;

    weapon.step(world, player, context(1));

    expect(world.previousX[slot]).toBe(0);
    expect(world.previousY[slot]).toBe(0);
    expect(world.x[slot]).toBeCloseTo(velocityX * FIXED_DELTA_SECONDS, 5);
    expect(world.y[slot]).toBeCloseTo(velocityY * FIXED_DELTA_SECONDS, 5);

    const afterFirstX = world.x[slot] ?? 0;
    const afterFirstY = world.y[slot] ?? 0;

    weapon.step(world, player, context(2));

    expect(world.previousX[slot]).toBeCloseTo(afterFirstX, 6);
    expect(world.previousY[slot]).toBeCloseTo(afterFirstY, 6);
    expect(world.x[slot]).toBeCloseTo(afterFirstX + velocityX * FIXED_DELTA_SECONDS, 5);
  });

  it('releases the projectile exactly when its lifetime reaches zero', () => {
    const world = new World(8);
    const player = createPlayer(world, 0, 0);
    const enemy = createEnemy(world, 3, 4);
    const enemySlot = world.slotOf(enemy);
    const weapon = new WeaponSystem();
    weapon.resetPlayer(world, player);

    weapon.step(world, player, context(0));
    const slots = projectileSlots(world);
    const slot = slots[0] as number;
    const projectile = (world.generations[slot] ?? 0) * world.masks.length + slot;
    world.x[enemySlot] = 1000;

    for (let tick = 1; tick <= PROJECTILE_LIFETIME_TICKS - 1; tick += 1) {
      weapon.step(world, player, context(tick));
      expect(world.isAlive(projectile)).toBe(true);
      expect(world.projectileLifetimeTicksRemaining[slot]).toBe(
        PROJECTILE_LIFETIME_TICKS - tick
      );
    }

    expect(world.x[slot]).toBeCloseTo(
      PROJECTILE_SPEED * 0.6 * ((PROJECTILE_LIFETIME_TICKS - 1) / SIMULATION_HZ),
      3
    );

    weapon.step(world, player, context(PROJECTILE_LIFETIME_TICKS));

    expect(world.isAlive(projectile)).toBe(false);
    expect(world.masks[slot]).toBe(0);
    expect(projectileSlots(world)).toHaveLength(0);
  });

  it('reuses an expired projectile slot with no ghost state', () => {
    const world = new World(8);
    const player = createPlayer(world, 0, 0);
    const enemy = createEnemy(world, 3, 4);
    const enemySlot = world.slotOf(enemy);
    const weapon = new WeaponSystem();
    weapon.resetPlayer(world, player);

    weapon.step(world, player, context(0));
    const slot = projectileSlots(world)[0] as number;
    const firstProjectile = (world.generations[slot] ?? 0) * world.masks.length + slot;

    world.health[slot] = 71;
    world.maxHealth[slot] = 72;
    world.faction[slot] = 73;
    world.passiveSlotIdentity[world.passiveSlotIndexOf(slot, 0)] = 74;
    world.passiveSlotLevel[world.passiveSlotIndexOf(slot, 0)] = 1;
    world.lastFacingX[slot] = 75;
    world.lastFacingY[slot] = -76;
    world.dashDirectionX[slot] = 77;
    world.dashDirectionY[slot] = -78;
    world.dashRemainingSeconds[slot] = 79;
    world.invulnerabilityTicksRemaining[slot] = 80;
    world.dashCooldownTicksRemaining[slot] = 81;
    world.dashCharges[slot] = 82;
    world.movementOverride[slot] = 1;
    world.enemySpeed[slot] = 83;
    world.contactDamage[slot] = 84;
    world.contactCooldownTicksRemaining[slot] = 85;
    world.xpValue[slot] = 86;
    world.weaponCooldownTicksRemaining[slot] = 87;
    world.abilitySlotIdentity[world.abilitySlotIndexOf(slot, 0)] = 88;
    world.abilitySlotTier[world.abilitySlotIndexOf(slot, 0)] = 1;
    world.xp[slot] = 89;
    world.level[slot] = 90;
    world.xpPickupValue[slot] = 91;

    world.x[enemySlot] = 1000;

    for (let tick = 1; tick <= PROJECTILE_LIFETIME_TICKS; tick += 1) {
      weapon.step(world, player, context(tick));
    }

    expect(world.isAlive(firstProjectile)).toBe(false);
    expect(world.masks[slot]).toBe(0);

    world.x[enemySlot] = 3;
    world.x[world.slotOf(player)] = 2;
    world.y[world.slotOf(player)] = -1;

    weapon.step(world, player, context(PROJECTILE_LIFETIME_TICKS + 1));
    const reusedSlots = projectileSlots(world);

    expect(reusedSlots).toEqual([slot]);
    const secondProjectile = (world.generations[slot] ?? 0) * world.masks.length + slot;
    expect(secondProjectile).not.toBe(firstProjectile);
    expect(world.isAlive(firstProjectile)).toBe(false);
    expect(world.isAlive(secondProjectile)).toBe(true);

    expect(world.masks[slot]).toBe(PROJECTILE_MASK);
    expect(world.x[slot]).toBe(2);
    expect(world.y[slot]).toBe(-1);
    expect(world.previousX[slot]).toBe(2);
    expect(world.previousY[slot]).toBe(-1);
    expect(world.radius[slot]).toBeCloseTo(PROJECTILE_RADIUS, 6);
    expect(world.projectileDamage[slot]).toBe(PROJECTILE_DAMAGE);
    expect(world.projectileLifetimeTicksRemaining[slot]).toBe(
      PROJECTILE_LIFETIME_TICKS
    );
    expect(world.health[slot]).toBe(0);
    expect(world.maxHealth[slot]).toBe(0);
    expect(world.faction[slot]).toBe(0);
    expect(world.passiveSlotIdentity[world.passiveSlotIndexOf(slot, 0)]).toBe(0);
    expect(world.passiveSlotLevel[world.passiveSlotIndexOf(slot, 0)]).toBe(0);
    expect(world.lastFacingX[slot]).toBe(0);
    expect(world.lastFacingY[slot]).toBe(0);
    expect(world.dashDirectionX[slot]).toBe(0);
    expect(world.dashDirectionY[slot]).toBe(0);
    expect(world.dashRemainingSeconds[slot]).toBe(0);
    expect(world.invulnerabilityTicksRemaining[slot]).toBe(0);
    expect(world.dashCooldownTicksRemaining[slot]).toBe(0);
    expect(world.dashCharges[slot]).toBe(0);
    expect(world.movementOverride[slot]).toBe(0);
    expect(world.enemySpeed[slot]).toBe(0);
    expect(world.contactDamage[slot]).toBe(0);
    expect(world.contactCooldownTicksRemaining[slot]).toBe(0);
    expect(world.xpValue[slot]).toBe(0);
    expect(world.weaponCooldownTicksRemaining[slot]).toBe(0);
    expect(world.abilitySlotIdentity[world.abilitySlotIndexOf(slot, 0)]).toBe(0);
    expect(world.abilitySlotTier[world.abilitySlotIndexOf(slot, 0)]).toBe(0);
    expect(world.xp[slot]).toBe(0);
    expect(world.level[slot]).toBe(0);
    expect(world.xpPickupValue[slot]).toBe(0);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects delta %s atomically',
    deltaSeconds => {
      const world = new World(8);
      const player = createPlayer(world, 0, 0);
      createEnemy(world, 3, 0);
      const weapon = new WeaponSystem();
      weapon.resetPlayer(world, player);
      const before = worldState(world);

      expect(() =>
        weapon.step(world, player, {
          tick: 0,
          deltaSeconds,
          intent: { moveX: 0, moveY: 0, dashPressed: false },
        })
      ).toThrow(RangeError);
      expect(worldState(world)).toEqual(before);
    }
  );

  it('rejects an invalid player boundary atomically', () => {
    const world = new World(8);
    const player = createPlayer(world, 0, 0);
    createEnemy(world, 3, 0);
    const weapon = new WeaponSystem();
    weapon.resetPlayer(world, player);

    const wrongMask = world.createEntity(ComponentMask.Player);
    const beforeWrongMask = worldState(world);
    expect(() => weapon.step(world, wrongMask, context(0))).toThrow(RangeError);
    expect(worldState(world)).toEqual(beforeWrongMask);
    world.destroyEntity(wrongMask);

    const beforeStale = worldState(world);
    expect(() => weapon.step(world, 987654, context(0))).toThrow(RangeError);
    expect(worldState(world)).toEqual(beforeStale);
  });
});
