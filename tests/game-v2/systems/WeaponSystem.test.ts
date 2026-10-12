import { describe, expect, it } from 'vitest';

import {
  CANNON_PROJECTILE,
  createAbilityRegistry,
  FLICKER_PROJECTILE,
  HEAVY_PROJECTILE,
  LANCE_PROJECTILE,
  NEEDLE_PROJECTILE,
  RAPID_PROJECTILE,
  SIEGE_PROJECTILE,
  STARTER_PROJECTILE,
} from '@/game-v2/config/AbilityRegistry';
import { type AbilityDefinition } from '@/game-v2/contracts/AbilitySlot';
import { AbilityLoadoutSystem } from '@/game-v2/systems/AbilityLoadoutSystem';
import {
  CANNON_PROJECTILE_COOLDOWN_TICKS_TIER_1,
  CANNON_PROJECTILE_DAMAGE_TIER_1,
  CANNON_PROJECTILE_RADIUS_TIER_1,
  ENEMY_FACTION,
  ENEMY_HEALTH,
  ENEMY_RADIUS,
  FLICKER_PROJECTILE_COOLDOWN_TICKS_TIER_1,
  FLICKER_PROJECTILE_DAMAGE_TIER_1,
  FLICKER_PROJECTILE_RADIUS_TIER_1,
  HEAVY_PROJECTILE_COOLDOWN_TICKS_TIER_1,
  HEAVY_PROJECTILE_DAMAGE_TIER_1,
  HEAVY_PROJECTILE_RADIUS_TIER_1,
  LANCE_PROJECTILE_COOLDOWN_TICKS_TIER_1,
  LANCE_PROJECTILE_DAMAGE_TIER_1,
  LANCE_PROJECTILE_RADIUS_TIER_1,
  NEEDLE_PROJECTILE_COOLDOWN_TICKS_TIER_1,
  NEEDLE_PROJECTILE_DAMAGE_TIER_1,
  NEEDLE_PROJECTILE_RADIUS_TIER_1,
  PROJECTILE_DAMAGE,
  PROJECTILE_LIFETIME_SECONDS,
  PROJECTILE_LIFETIME_TICKS,
  PROJECTILE_RADIUS,
  PROJECTILE_SPEED,
  RAPID_PROJECTILE_COOLDOWN_TICKS_TIER_1,
  RAPID_PROJECTILE_DAMAGE_TIER_1,
  RAPID_PROJECTILE_RADIUS_TIER_1,
  SIEGE_PROJECTILE_COOLDOWN_TICKS_TIER_1,
  SIEGE_PROJECTILE_DAMAGE_TIER_1,
  SIEGE_PROJECTILE_RADIUS_TIER_1,
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

const loadoutIdentity = (world: World, player: EntityId): string | null =>
  new AbilityLoadoutSystem().identityAt(world, player, 0);

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
      world.lifetimeTicksRemaining[slot] === PROJECTILE_LIFETIME_TICKS
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
  lifetimeTicksRemaining: [...world.lifetimeTicksRemaining],
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
    // Strided per ability slot since `V2-111`; a bare `[slot]` write would land
    // in an arbitrary stride cell and pass for the wrong reason.
    for (let index = 0; index < 4; index += 1) {
      world.weaponCooldownTicksRemaining[world.abilitySlotIndexOf(slot, index)] = 17;
    }
    const weapon = new WeaponSystem();
    const loadout = new AbilityLoadoutSystem();

    weapon.resetPlayer(world, player);

    for (let index = 0; index < 4; index += 1) {
      expect(
        world.weaponCooldownTicksRemaining[world.abilitySlotIndexOf(slot, index)]
      ).toBe(0);
    }
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

  it('refuses to fire without any autonomous weapon in the loadout', () => {
    // Since `V2-111` firing is not tied to slot 0, so the loud guard is
    // "no auto weapon anywhere" rather than "slot 0 is empty". It still catches
    // a missing `resetPlayer`, which is what it exists for.
    const world = new World(4);
    const player = createPlayer(world);
    const weapon = new WeaponSystem();
    const loadout = new AbilityLoadoutSystem();

    weapon.resetPlayer(world, player);
    loadout.remove(world, player, 0);

    expect(() => weapon.step(world, player, context(0))).toThrow(
      'player holds no autonomous weapon'
    );
    expect(() => weapon.advanceStarterTier(world, player)).toThrow(
      'player holds no starter weapon'
    );
  });

  it('fires from a later slot when slot 0 is empty', () => {
    // The inverse of the guard above: an empty slot 0 must not silence a
    // weapon held elsewhere. This is the exact case the pre-V2-111 system got
    // wrong in reverse, by only ever reading slot 0.
    const world = new World(8);
    const player = createPlayer(world);
    const weapon = new WeaponSystem();
    const loadout = new AbilityLoadoutSystem();

    weapon.resetPlayer(world, player);
    loadout.add(world, player, HEAVY_PROJECTILE.id);
    loadout.remove(world, player, 0);
    createEnemy(world, 5, 0);

    weapon.step(world, player, context(0));

    const slots = projectileSlots(world);
    expect(slots).toHaveLength(1);
    expect(world.projectileDamage[slots[0] as number]).toBe(
      HEAVY_PROJECTILE_DAMAGE_TIER_1
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
    expect(world.lifetimeTicksRemaining[slot]).toBe(PROJECTILE_LIFETIME_TICKS);
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
      expect(world.lifetimeTicksRemaining[slot]).toBe(PROJECTILE_LIFETIME_TICKS - tick);
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
    // Strided per ability slot since `V2-111`, so seed every entry: clearing
    // only index 0 would otherwise leave ghost cadence behind on reuse.
    world.weaponCooldownTicksRemaining[world.abilitySlotIndexOf(slot, 0)] = 87;
    world.weaponCooldownTicksRemaining[world.abilitySlotIndexOf(slot, 1)] = 87;
    world.weaponCooldownTicksRemaining[world.abilitySlotIndexOf(slot, 2)] = 87;
    world.weaponCooldownTicksRemaining[world.abilitySlotIndexOf(slot, 3)] = 87;
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
    expect(world.lifetimeTicksRemaining[slot]).toBe(PROJECTILE_LIFETIME_TICKS);
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
    for (let index = 0; index < 4; index += 1) {
      expect(
        world.weaponCooldownTicksRemaining[world.abilitySlotIndexOf(slot, index)]
      ).toBe(0);
    }
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

/**
 * V2-106 Step 3: `WeaponSystem` fires whatever identity occupies ability slot
 * 0, not only `starter-projectile` (V2-ADR-064). These worlds are
 * constructed directly — `resetPlayer` still hardcodes the starter per
 * V2-ADR-065 — placing a non-starter start-eligible identity into slot 0
 * through the same production `AbilityLoadoutSystem.add` path
 * `resetPlayer` itself uses.
 */
describe('WeaponSystem firing a non-starter start-eligible identity (V2-106)', () => {
  it('fires heavy-projectile Tier 1 with its own damage, radius, and cooldown', () => {
    const world = new World(8);
    const player = createPlayer(world, 0, 0);
    const playerSlot = world.slotOf(player);
    createEnemy(world, 4, 0);
    const weapon = new WeaponSystem();
    const loadout = new AbilityLoadoutSystem();
    loadout.resetOwner(world, player);
    loadout.add(world, player, 'heavy-projectile');
    world.weaponCooldownTicksRemaining[playerSlot] = 0;

    weapon.step(world, player, context(0));
    const slot = projectileSlots(world)[0] as number;

    expect(world.projectileDamage[slot]).toBe(HEAVY_PROJECTILE_DAMAGE_TIER_1);
    expect(world.radius[slot]).toBeCloseTo(HEAVY_PROJECTILE_RADIUS_TIER_1, 6);
    expect(world.weaponCooldownTicksRemaining[playerSlot]).toBe(
      HEAVY_PROJECTILE_COOLDOWN_TICKS_TIER_1
    );
  });

  it('fires rapid-projectile Tier 1 with its own damage, radius, and cooldown', () => {
    const world = new World(8);
    const player = createPlayer(world, 0, 0);
    const playerSlot = world.slotOf(player);
    createEnemy(world, 4, 0);
    const weapon = new WeaponSystem();
    const loadout = new AbilityLoadoutSystem();
    loadout.resetOwner(world, player);
    loadout.add(world, player, 'rapid-projectile');
    world.weaponCooldownTicksRemaining[playerSlot] = 0;

    weapon.step(world, player, context(0));
    const slot = projectileSlots(world)[0] as number;

    expect(world.projectileDamage[slot]).toBe(RAPID_PROJECTILE_DAMAGE_TIER_1);
    expect(world.radius[slot]).toBeCloseTo(RAPID_PROJECTILE_RADIUS_TIER_1, 6);
    expect(world.weaponCooldownTicksRemaining[playerSlot]).toBe(
      RAPID_PROJECTILE_COOLDOWN_TICKS_TIER_1
    );
  });

  it.each([HEAVY_PROJECTILE.id, RAPID_PROJECTILE.id] as const)(
    'advances %s through all three tiers and fires each with the held tier effect',
    identity => {
      const world = new World(8);
      const player = createPlayer(world, 0, 0);
      const playerSlot = world.slotOf(player);
      createEnemy(world, 4, 0);
      const weapon = new WeaponSystem();
      const loadout = new AbilityLoadoutSystem();
      loadout.resetOwner(world, player);
      loadout.add(world, player, identity);

      expect(weapon.advanceStarterTier(world, player)).toBe(2);
      expect(weapon.advanceStarterTier(world, player)).toBe(3);

      const expectedTier3 = loadout.tierEffectAt(world, player, 0);
      world.weaponCooldownTicksRemaining[playerSlot] = 0;

      weapon.step(world, player, context(0));
      const slot = projectileSlots(world)[0] as number;

      expect(world.projectileDamage[slot]).toBe(expectedTier3?.damage);
      expect(world.radius[slot]).toBeCloseTo(expectedTier3?.projectileRadius ?? -1, 6);
      expect(world.weaponCooldownTicksRemaining[playerSlot]).toBe(
        expectedTier3?.cooldownTicks
      );
    }
  );

  it('does not regress starter-projectile firing after generalizing the slot-0 lookup', () => {
    const world = new World(8);
    const player = createPlayer(world, 0, 0);
    createEnemy(world, 4, 0);
    const weapon = new WeaponSystem();
    weapon.resetPlayer(world, player);

    weapon.step(world, player, context(0));
    const slot = projectileSlots(world)[0] as number;

    expect(world.projectileDamage[slot]).toBe(PROJECTILE_DAMAGE);
    expect(world.radius[slot]).toBeCloseTo(PROJECTILE_RADIUS, 6);
    expect(loadoutIdentity(world, player)).toBe(STARTER_PROJECTILE.id);
  });
});

/**
 * V2-107 Step 3: proves `WeaponSystem` fires each of the five mid-run-only
 * identities correctly when directly constructed in ability slot 0,
 * mirroring V2-106's non-starter firing proof. `resetPlayer` itself is
 * unchanged (V2-ADR-068) — these worlds place the identity via the same
 * production `AbilityLoadoutSystem.add` path `resetPlayer` uses.
 */
const MID_RUN_ONLY_TIER_1_CASES = [
  {
    identity: NEEDLE_PROJECTILE.id,
    damage: NEEDLE_PROJECTILE_DAMAGE_TIER_1,
    radius: NEEDLE_PROJECTILE_RADIUS_TIER_1,
    cooldown: NEEDLE_PROJECTILE_COOLDOWN_TICKS_TIER_1,
  },
  {
    identity: FLICKER_PROJECTILE.id,
    damage: FLICKER_PROJECTILE_DAMAGE_TIER_1,
    radius: FLICKER_PROJECTILE_RADIUS_TIER_1,
    cooldown: FLICKER_PROJECTILE_COOLDOWN_TICKS_TIER_1,
  },
  {
    identity: LANCE_PROJECTILE.id,
    damage: LANCE_PROJECTILE_DAMAGE_TIER_1,
    radius: LANCE_PROJECTILE_RADIUS_TIER_1,
    cooldown: LANCE_PROJECTILE_COOLDOWN_TICKS_TIER_1,
  },
  {
    identity: CANNON_PROJECTILE.id,
    damage: CANNON_PROJECTILE_DAMAGE_TIER_1,
    radius: CANNON_PROJECTILE_RADIUS_TIER_1,
    cooldown: CANNON_PROJECTILE_COOLDOWN_TICKS_TIER_1,
  },
  {
    identity: SIEGE_PROJECTILE.id,
    damage: SIEGE_PROJECTILE_DAMAGE_TIER_1,
    radius: SIEGE_PROJECTILE_RADIUS_TIER_1,
    cooldown: SIEGE_PROJECTILE_COOLDOWN_TICKS_TIER_1,
  },
];

describe('WeaponSystem firing a mid-run-only identity (V2-107)', () => {
  it.each(MID_RUN_ONLY_TIER_1_CASES)(
    'fires $identity Tier 1 with its own damage, radius, and cooldown',
    ({ identity, damage, radius, cooldown }) => {
      const world = new World(8);
      const player = createPlayer(world, 0, 0);
      const playerSlot = world.slotOf(player);
      createEnemy(world, 4, 0);
      const weapon = new WeaponSystem();
      const loadout = new AbilityLoadoutSystem();
      loadout.resetOwner(world, player);
      loadout.add(world, player, identity);
      world.weaponCooldownTicksRemaining[playerSlot] = 0;

      weapon.step(world, player, context(0));
      const slot = projectileSlots(world)[0] as number;

      expect(world.projectileDamage[slot]).toBe(damage);
      expect(world.radius[slot]).toBeCloseTo(radius, 6);
      expect(world.weaponCooldownTicksRemaining[playerSlot]).toBe(cooldown);
    }
  );

  it.each(MID_RUN_ONLY_TIER_1_CASES.map(({ identity }) => identity))(
    'advances %s through all three tiers and fires each with the held tier effect',
    identity => {
      const world = new World(8);
      const player = createPlayer(world, 0, 0);
      const playerSlot = world.slotOf(player);
      createEnemy(world, 4, 0);
      const weapon = new WeaponSystem();
      const loadout = new AbilityLoadoutSystem();
      loadout.resetOwner(world, player);
      loadout.add(world, player, identity);

      expect(weapon.advanceStarterTier(world, player)).toBe(2);
      expect(weapon.advanceStarterTier(world, player)).toBe(3);

      const expectedTier3 = loadout.tierEffectAt(world, player, 0);
      world.weaponCooldownTicksRemaining[playerSlot] = 0;

      weapon.step(world, player, context(0));
      const slot = projectileSlots(world)[0] as number;

      expect(world.projectileDamage[slot]).toBe(expectedTier3?.damage);
      expect(world.radius[slot]).toBeCloseTo(expectedTier3?.projectileRadius ?? -1, 6);
      expect(world.weaponCooldownTicksRemaining[playerSlot]).toBe(
        expectedTier3?.cooldownTicks
      );
    }
  );
});

/**
 * `V2-111` — concurrent autonomous weapon slots.
 *
 * Before this block, `WeaponSystem` fired ability slot `0` only and owned one
 * cooldown counter keyed by the player's *world* slot, so every identity a
 * player acquired after the starter weapon sat permanently un-fired
 * (V2-ADR-068's deferral). These tests pin the fixed contract.
 */
describe('WeaponSystem concurrent auto slots (V2-ADR-076, V2-ADR-077)', () => {
  const loadout = new AbilityLoadoutSystem();

  const cooldownAt = (world: World, player: EntityId, index: number): number =>
    world.weaponCooldownTicksRemaining[
      world.abilitySlotIndexOf(world.slotOf(player), index)
    ] ?? -1;

  it('fires every occupied auto slot on its own authored cadence', () => {
    const world = new World(64);
    const weapons = new WeaponSystem();
    const player = createPlayer(world);

    weapons.resetPlayer(world, player);
    // Slot 0 = starter (30 ticks), slot 1 = rapid (15 ticks).
    loadout.add(world, player, RAPID_PROJECTILE.id);
    createEnemy(world, 5, 0);

    let starterFires = 0;
    let rapidFires = 0;

    for (let tick = 0; tick < 60; tick += 1) {
      const before = projectileSlots(world).length;
      weapons.step(world, player, context(tick));

      for (const slot of projectileSlots(world)) {
        if (world.lifetimeTicksRemaining[slot] !== PROJECTILE_LIFETIME_TICKS) {
          continue;
        }
        // Damage is the only per-slot signature a single-weapon mutant cannot
        // fake, mirroring V2-013 review fix round 2's technique.
        if (world.projectileDamage[slot] === PROJECTILE_DAMAGE) {
          starterFires += 1;
        } else if (world.projectileDamage[slot] === RAPID_PROJECTILE_DAMAGE_TIER_1) {
          rapidFires += 1;
        }
      }
      void before;
    }

    expect(starterFires).toBe(60 / WEAPON_COOLDOWN_TICKS);
    expect(rapidFires).toBe(60 / RAPID_PROJECTILE_COOLDOWN_TICKS_TIER_1);
    expect(rapidFires).toBeGreaterThan(starterFires);
  });

  it('keeps each slot cooldown independent of its neighbours', () => {
    const world = new World(64);
    const weapons = new WeaponSystem();
    const player = createPlayer(world);

    weapons.resetPlayer(world, player);
    loadout.add(world, player, SIEGE_PROJECTILE.id);
    createEnemy(world, 5, 0);

    weapons.step(world, player, context(0));

    // Both fired on tick 0 and each re-armed to its own authored cadence.
    expect(cooldownAt(world, player, 0)).toBe(WEAPON_COOLDOWN_TICKS);
    expect(cooldownAt(world, player, 1)).toBe(SIEGE_PROJECTILE_COOLDOWN_TICKS_TIER_1);
    expect(cooldownAt(world, player, 2)).toBe(0);
    expect(cooldownAt(world, player, 3)).toBe(0);
  });

  it('fires four occupied auto slots within a single tick', () => {
    const world = new World(64);
    const weapons = new WeaponSystem();
    const player = createPlayer(world);

    weapons.resetPlayer(world, player);
    loadout.add(world, player, HEAVY_PROJECTILE.id);
    loadout.add(world, player, LANCE_PROJECTILE.id);
    loadout.add(world, player, CANNON_PROJECTILE.id);
    createEnemy(world, 5, 0);

    weapons.step(world, player, context(0));

    const damages = projectileSlots(world)
      .map(slot => world.projectileDamage[slot] ?? 0)
      .sort((left, right) => left - right);

    expect(damages).toEqual(
      [
        PROJECTILE_DAMAGE,
        HEAVY_PROJECTILE_DAMAGE_TIER_1,
        LANCE_PROJECTILE_DAMAGE_TIER_1,
        CANNON_PROJECTILE_DAMAGE_TIER_1,
      ].sort((left, right) => left - right)
    );
  });

  it('spawns concurrent fires in ascending ability slot order', () => {
    const world = new World(64);
    const weapons = new WeaponSystem();
    const player = createPlayer(world);

    weapons.resetPlayer(world, player);
    loadout.add(world, player, HEAVY_PROJECTILE.id);
    loadout.add(world, player, LANCE_PROJECTILE.id);
    createEnemy(world, 5, 0);

    weapons.step(world, player, context(0));

    // The World allocator hands out slots in a deterministic order, so the
    // ascending-slot firing order is observable as ascending world slots.
    // A descending mutant reverses this sequence.
    const damagesInSpawnOrder = projectileSlots(world).map(
      slot => world.projectileDamage[slot] ?? 0
    );

    expect(damagesInSpawnOrder).toEqual([
      PROJECTILE_DAMAGE,
      HEAVY_PROJECTILE_DAMAGE_TIER_1,
      LANCE_PROJECTILE_DAMAGE_TIER_1,
    ]);
  });

  it('refuses the whole tick atomically when capacity cannot hold every ready fire', () => {
    // Two ready weapons, one free slot: the tick must create nothing rather
    // than fire the first and throw on the second.
    const world = new World(3);
    const weapons = new WeaponSystem();
    const player = createPlayer(world);

    weapons.resetPlayer(world, player);
    loadout.add(world, player, HEAVY_PROJECTILE.id);
    createEnemy(world, 5, 0);

    // Two weapons are ready; exactly one slot is free.
    expect(world.freeSlotCount).toBe(1);

    expect(() => weapons.step(world, player, context(0))).toThrow(
      'entity capacity exhausted'
    );

    expect(projectileSlots(world)).toHaveLength(0);
    expect(world.freeSlotCount).toBe(1);
    // No cooldown may be re-armed by a refused tick either.
    expect(cooldownAt(world, player, 0)).toBe(0);
    expect(cooldownAt(world, player, 1)).toBe(0);
  });

  it('skips empty slots without consuming a cooldown', () => {
    const world = new World(64);
    const weapons = new WeaponSystem();
    const player = createPlayer(world);

    weapons.resetPlayer(world, player);
    createEnemy(world, 5, 0);

    weapons.step(world, player, context(0));

    expect(cooldownAt(world, player, 1)).toBe(0);
    expect(cooldownAt(world, player, 2)).toBe(0);
    expect(cooldownAt(world, player, 3)).toBe(0);
    expect(projectileSlots(world)).toHaveLength(1);
  });

  it('zeroes every ability slot cooldown on resetPlayer', () => {
    const world = new World(64);
    const weapons = new WeaponSystem();
    const player = createPlayer(world);
    const playerSlot = world.slotOf(player);

    for (let index = 0; index < 4; index += 1) {
      world.weaponCooldownTicksRemaining[world.abilitySlotIndexOf(playerSlot, index)] =
        99;
    }

    weapons.resetPlayer(world, player);

    for (let index = 0; index < 4; index += 1) {
      expect(cooldownAt(world, player, index)).toBe(0);
    }
  });
});

/**
 * `active`-activation coverage (V2-ADR-077).
 *
 * No registered identity is `active` today, so the activation filter in
 * `autoTierEffectAt` is unreachable through the production registry — a
 * mutation pass proved that deleting it changed nothing. This block injects an
 * `active` identity, the V2-ADR-039 way to test a contract before production
 * content reaches it, so the filter is load-bearing rather than decorative.
 */
describe('WeaponSystem active-activation slots (V2-ADR-077)', () => {
  const ACTIVE_ABILITY: AbilityDefinition = Object.freeze({
    // Reuses `heavy-projectile`'s id so no production identity type widens for
    // a test; only its `activation` differs from the shipped definition.
    id: HEAVY_PROJECTILE.id,
    code: HEAVY_PROJECTILE.code,
    activation: 'active',
    authoredTiers: 1,
    startEligible: false,
    tierEffects: Object.freeze([
      Object.freeze({
        ability: HEAVY_PROJECTILE.id,
        damage: HEAVY_PROJECTILE_DAMAGE_TIER_1,
        projectileRadius: HEAVY_PROJECTILE_RADIUS_TIER_1,
        cooldownTicks: HEAVY_PROJECTILE_COOLDOWN_TICKS_TIER_1,
      }),
    ]),
  });

  const registryWithActive = createAbilityRegistry([
    STARTER_PROJECTILE,
    ACTIVE_ABILITY,
  ]);

  it('never fires an occupied active slot', () => {
    const world = new World(16);
    const loadout = new AbilityLoadoutSystem(registryWithActive);
    const weapons = new WeaponSystem(undefined, loadout);
    const player = createPlayer(world);

    weapons.resetPlayer(world, player);
    loadout.add(world, player, ACTIVE_ABILITY.id);
    createEnemy(world, 5, 0);

    expect(loadout.activationAt(world, player, 1)).toBe('active');

    weapons.step(world, player, context(0));

    const damages = projectileSlots(world).map(slot => world.projectileDamage[slot]);

    // Only the starter weapon fired; the active slot produced nothing.
    expect(damages).toEqual([PROJECTILE_DAMAGE]);
    // And the active slot's cooldown was never armed, so it owns no cadence.
    expect(
      world.weaponCooldownTicksRemaining[
        world.abilitySlotIndexOf(world.slotOf(player), 1)
      ]
    ).toBe(0);
  });

  it('refuses to fire when every occupied slot is active', () => {
    const world = new World(16);
    const loadout = new AbilityLoadoutSystem(registryWithActive);
    const weapons = new WeaponSystem(undefined, loadout);
    const player = createPlayer(world);

    weapons.resetPlayer(world, player);
    loadout.add(world, player, ACTIVE_ABILITY.id);
    loadout.remove(world, player, 0);
    createEnemy(world, 5, 0);

    expect(() => weapons.step(world, player, context(0))).toThrow(
      'player holds no autonomous weapon'
    );
  });
});

describe('WeaponSystem per-tick scratch isolation (V2-111)', () => {
  it('does not leak one player scratch cooldown into another player empty slots', () => {
    // `step`'s per-tick buffers are preallocated and reused, so a slot index
    // that held an `auto` weapon on the previous call must not write that
    // leftover cadence into a different player's empty slot on the next one.
    const world = new World(64);
    const loadout = new AbilityLoadoutSystem();
    const weapons = new WeaponSystem(undefined, loadout);

    const armedPlayer = createPlayer(world, 0, 0);
    const starterOnlyPlayer = createPlayer(world, 40, 0);

    weapons.resetPlayer(world, armedPlayer);
    loadout.add(world, armedPlayer, SIEGE_PROJECTILE.id);
    loadout.add(world, armedPlayer, CANNON_PROJECTILE.id);
    loadout.add(world, armedPlayer, LANCE_PROJECTILE.id);

    weapons.resetPlayer(world, starterOnlyPlayer);

    createEnemy(world, 3, 0);

    // Tick 0 arms all four of the armed player's slots.
    weapons.step(world, armedPlayer, context(0));
    // Tick 1 leaves them all non-zero, so the scratch buffer is fully dirty.
    weapons.step(world, armedPlayer, context(1));

    const armedSlot = world.slotOf(armedPlayer);
    for (let index = 1; index < 4; index += 1) {
      expect(
        world.weaponCooldownTicksRemaining[world.abilitySlotIndexOf(armedSlot, index)]
      ).toBeGreaterThan(0);
    }

    // The same instance now steps a player holding only the starter weapon.
    weapons.step(world, starterOnlyPlayer, context(2));

    const starterSlot = world.slotOf(starterOnlyPlayer);
    for (let index = 1; index < 4; index += 1) {
      expect(
        world.weaponCooldownTicksRemaining[world.abilitySlotIndexOf(starterSlot, index)]
      ).toBe(0);
    }
  });
});
