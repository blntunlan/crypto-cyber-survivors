import {
  PROJECTILE_LIFETIME_TICKS,
  PROJECTILE_SPEED,
} from '@/game-v2/config/Mvp0Config';
import { STARTER_PROJECTILE } from '@/game-v2/config/AbilityRegistry';
import { type AbilityTierEffect } from '@/game-v2/contracts/AbilityTierEffect';
import {
  ABILITY_SLOT_COUNT,
  type AbilitySlotIndex,
  type AbilityTier,
} from '@/game-v2/contracts/AbilitySlot';
import { NO_ENTITY, type EntityId } from '@/game-v2/contracts/EntityId';
import { type StepContext } from '@/game-v2/contracts/StepContext';
import { AbilityLoadoutSystem } from '@/game-v2/systems/AbilityLoadoutSystem';
import { assertStepContext } from '@/game-v2/systems/StepContextValidator';
import { TargetingSystem } from '@/game-v2/systems/TargetingSystem';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { type World } from '@/game-v2/world/World';

const PLAYER_ENTITY_MASK =
  ComponentMask.Transform | ComponentMask.Player | ComponentMask.AbilityLoadout;

/**
 * MVP-0 projectiles carry no faction. Ownership and hit filtering belong to
 * V2-012; `Body` is owned here only because the render writer copies `radius`.
 */
const PROJECTILE_ENTITY_MASK =
  ComponentMask.Transform |
  ComponentMask.Velocity |
  ComponentMask.Body |
  ComponentMask.Projectile;

const DEFAULT_FIRE_DIRECTION_X = 1;
const DEFAULT_FIRE_DIRECTION_Y = 0;

/**
 * The starter weapon's fixed home. `resetPlayer` always seats
 * `starter-projectile` here, so `starterDamageOf` and `advanceStarterTier` can
 * name it directly. Firing is **not** limited to it: since `V2-111` every
 * occupied `auto` slot fires (V2-ADR-077).
 */
const STARTER_WEAPON_SLOT_INDEX: AbilitySlotIndex = 0;

/**
 * Scratch sentinel for a slot this system does not own — empty, or holding an
 * `active` identity. Distinguishable from every real cooldown, which is a
 * non-negative tick count.
 */
const NOT_AN_AUTO_SLOT = -1;

/**
 * The ability slot indices in firing order. A frozen literal rather than a
 * counting loop so the iteration is typed as `AbilitySlotIndex` without a cast,
 * and so a mutant that reverses the order is a visible edit (V2-ADR-077).
 */
const ABILITY_SLOT_FIRING_ORDER: readonly AbilitySlotIndex[] = Object.freeze([
  0, 1, 2, 3,
] as const);

const isProjectile = (mask: number | undefined): boolean =>
  mask !== undefined && (mask & PROJECTILE_ENTITY_MASK) === PROJECTILE_ENTITY_MASK;

export class WeaponSystem {
  private readonly targetingSystem: TargetingSystem;
  private readonly loadout: AbilityLoadoutSystem;
  /**
   * Preallocated per-tick scratch. `step` runs inside the fixed-step loop, so
   * it allocates nothing: both buffers are overwritten in full at the top of
   * every call before either is read.
   */
  private readonly readyEffects: (AbilityTierEffect | null)[] = new Array(
    ABILITY_SLOT_COUNT
  ).fill(null);
  private readonly nextCooldowns: number[] = new Array(ABILITY_SLOT_COUNT).fill(
    NOT_AN_AUTO_SLOT
  );

  public constructor(
    targetingSystem: TargetingSystem = new TargetingSystem(),
    loadout: AbilityLoadoutSystem = new AbilityLoadoutSystem()
  ) {
    this.targetingSystem = targetingSystem;
    this.loadout = loadout;
  }

  public resetPlayer(world: World, playerEntity: EntityId): void {
    const slot = world.slotOf(playerEntity);
    const mask = world.masks[slot];

    if (mask === undefined || (mask & PLAYER_ENTITY_MASK) !== PLAYER_ENTITY_MASK) {
      throw new RangeError('player entity is missing required components');
    }

    for (const index of ABILITY_SLOT_FIRING_ORDER) {
      world.weaponCooldownTicksRemaining[world.abilitySlotIndexOf(slot, index)] = 0;
    }

    this.loadout.resetOwner(world, playerEntity);
    this.loadout.add(world, playerEntity, STARTER_PROJECTILE.id);
  }

  /**
   * Advances the starter weapon one tier.
   *
   * Damage is derived from the tier held in the loadout, so this is the whole
   * upgrade: there is no second weapon-damage authority to keep in step
   * (V2-ADR-038). The loadout refuses to pass the identity's authored ceiling,
   * which is what makes a second call throw rather than double-upgrade.
   */
  public advanceStarterTier(world: World, playerEntity: EntityId): AbilityTier {
    this.assertPlayer(world, playerEntity);

    return this.loadout.advanceTier(
      world,
      playerEntity,
      this.starterSlotIndex(world, playerEntity)
    );
  }

  /**
   * The damage the starter weapon fires with right now.
   *
   * Exposed for the read-only runtime readout so the HUD reads the same derived
   * value the simulation fires with, instead of a second stored copy.
   */
  public starterDamageOf(world: World, playerEntity: EntityId): number {
    this.assertPlayer(world, playerEntity);

    return this.starterTierEffect(world, playerEntity).damage;
  }

  private assertPlayer(world: World, playerEntity: EntityId): number {
    const slot = world.slotOf(playerEntity);
    const mask = world.masks[slot];

    if (mask === undefined || (mask & PLAYER_ENTITY_MASK) !== PLAYER_ENTITY_MASK) {
      throw new RangeError('player entity is missing required components');
    }

    return slot;
  }

  private starterSlotIndex(world: World, playerEntity: EntityId): AbilitySlotIndex {
    const identity = this.loadout.identityAt(
      world,
      playerEntity,
      STARTER_WEAPON_SLOT_INDEX
    );

    if (identity === null) {
      throw new RangeError('player holds no starter weapon');
    }

    return STARTER_WEAPON_SLOT_INDEX;
  }

  /**
   * The authored effect for ability slot `index`, or `null` when the slot is
   * empty or holds a non-`auto` identity.
   *
   * `active` identities are skipped rather than fired: their `1`–`4` binding is
   * owned by whatever task authors manual abilities, and no registered identity
   * is `active` today.
   */
  private autoTierEffectAt(
    world: World,
    playerEntity: EntityId,
    index: AbilitySlotIndex
  ): AbilityTierEffect | null {
    if (this.loadout.activationAt(world, playerEntity, index) !== 'auto') {
      return null;
    }

    return this.loadout.tierEffectAt(world, playerEntity, index);
  }

  /**
   * Reads the authored effect for the tier the loadout currently holds
   * (V2-ADR-046). `AbilityLoadoutSystem.tierEffectAt` is the single lookup
   * path from a held slot to what it fires with, so damage, projectile
   * radius, and cooldown can never independently drift.
   */
  private starterTierEffect(world: World, playerEntity: EntityId): AbilityTierEffect {
    const effect = this.loadout.tierEffectAt(
      world,
      playerEntity,
      this.starterSlotIndex(world, playerEntity)
    );

    if (effect === null) {
      throw new RangeError('player holds no starter weapon');
    }

    return effect;
  }

  /**
   * Advances live projectiles, then resolves the fixed-tick firing cadence.
   *
   * The cooldown is decremented before the fire test, so a 30-tick cooldown
   * fires on ticks 0, 30, 60 and 90 rather than 0, 31, 62. A tick without a
   * target creates no projectile and does not re-arm the cooldown, leaving the
   * weapon ready to fire on the first tick a target exists.
   */
  public step(world: World, playerEntity: EntityId, context: StepContext): void {
    assertStepContext(context);

    const playerSlot = world.slotOf(playerEntity);
    const playerMask = world.masks[playerSlot];

    if (
      playerMask === undefined ||
      (playerMask & PLAYER_ENTITY_MASK) !== PLAYER_ENTITY_MASK
    ) {
      throw new RangeError('player entity is missing required components');
    }

    const playerX = world.x[playerSlot];
    const playerY = world.y[playerSlot];
    const lastFacingX = world.lastFacingX[playerSlot];
    const lastFacingY = world.lastFacingY[playerSlot];

    if (
      playerX === undefined ||
      playerY === undefined ||
      lastFacingX === undefined ||
      lastFacingY === undefined ||
      !Number.isFinite(playerX) ||
      !Number.isFinite(playerY) ||
      !Number.isFinite(lastFacingX) ||
      !Number.isFinite(lastFacingY)
    ) {
      throw new RangeError('player weapon state must be finite');
    }

    // Pass 1: advance every occupied `auto` slot's cadence and record which of
    // them come up ready, without mutating the world. Ascending slot order is
    // the determinism contract (V2-ADR-077).
    let readyCount = 0;
    let autoSlotCount = 0;

    for (const index of ABILITY_SLOT_FIRING_ORDER) {
      const effect = this.autoTierEffectAt(world, playerEntity, index);

      this.readyEffects[index] = null;
      // `NOT_AN_AUTO_SLOT` keeps an empty or `active` slot from committing a
      // stale cooldown left in this reused scratch buffer by an earlier tick.
      this.nextCooldowns[index] = NOT_AN_AUTO_SLOT;

      if (effect === null) {
        continue;
      }

      autoSlotCount += 1;

      const { damage } = effect;

      if (!Number.isFinite(damage) || damage < 0) {
        throw new RangeError('player weapon state must be finite');
      }

      const storeIndex = world.abilitySlotIndexOf(playerSlot, index);
      let nextCooldown = world.weaponCooldownTicksRemaining[storeIndex] ?? 0;

      if (nextCooldown > 0) {
        nextCooldown -= 1;
      }

      this.nextCooldowns[index] = nextCooldown;

      if (nextCooldown === 0) {
        this.readyEffects[index] = effect;
        readyCount += 1;
      }
    }

    // A player always carries at least one autonomous weapon: `resetPlayer`
    // seats the starter and no path removes it. Holding none means `resetPlayer`
    // was never called, which must fail loudly here rather than present as a
    // player who silently never shoots — the defect class V2-012's review found
    // in `CombatSystem`.
    if (autoSlotCount === 0) {
      throw new RangeError('player holds no autonomous weapon');
    }

    // A target is resolved at most once per tick. `findNearestTarget` is pure
    // and nothing below mutates an enemy, so every ready slot would compute the
    // identical answer including the ascending-slot tie-break (V2-ADR-077).
    const target =
      readyCount > 0
        ? this.targetingSystem.findNearestTarget(world, playerEntity)
        : NO_ENTITY;
    const firingCount = target === NO_ENTITY ? 0 : readyCount;

    // Whole-tick precondition (V2-ADR-079): with up to `ABILITY_SLOT_COUNT`
    // fires per tick, a per-fire check could fire some slots and then throw,
    // leaving the tick half-applied. Nothing has been mutated yet here.
    if (firingCount > world.freeSlotCount) {
      throw new RangeError('entity capacity exhausted');
    }

    this.advanceProjectiles(world, context.deltaSeconds);

    for (const index of ABILITY_SLOT_FIRING_ORDER) {
      const effect = this.readyEffects[index];

      if (effect === undefined || effect === null) {
        continue;
      }

      const storeIndex = world.abilitySlotIndexOf(playerSlot, index);

      if (target === NO_ENTITY) {
        // Stay armed: the weapon fires on the first tick a target exists.
        world.weaponCooldownTicksRemaining[storeIndex] = 0;
        continue;
      }

      this.fire(
        world,
        playerEntity,
        target,
        playerX,
        playerY,
        effect.damage,
        effect.projectileRadius
      );
      world.weaponCooldownTicksRemaining[storeIndex] = effect.cooldownTicks;
    }

    // Occupied `auto` slots that were not ready commit their decremented
    // cadence. Ready slots were already written above; `NOT_AN_AUTO_SLOT`
    // marks slots this system does not own.
    for (const index of ABILITY_SLOT_FIRING_ORDER) {
      const nextCooldown = this.nextCooldowns[index];

      if (
        nextCooldown === undefined ||
        nextCooldown === NOT_AN_AUTO_SLOT ||
        this.readyEffects[index] !== null
      ) {
        continue;
      }

      world.weaponCooldownTicksRemaining[world.abilitySlotIndexOf(playerSlot, index)] =
        nextCooldown;
    }
  }

  private advanceProjectiles(world: World, deltaSeconds: number): void {
    for (let slot = 0; slot < world.masks.length; slot += 1) {
      if (!isProjectile(world.masks[slot])) {
        continue;
      }

      const lifetime = world.lifetimeTicksRemaining[slot] ?? 0;

      if (lifetime === 0) {
        world.destroyEntity(world.entityIdOf(slot));
        continue;
      }

      const currentX = world.x[slot];
      const currentY = world.y[slot];
      const velocityX = world.velocityX[slot];
      const velocityY = world.velocityY[slot];

      if (
        currentX === undefined ||
        currentY === undefined ||
        velocityX === undefined ||
        velocityY === undefined ||
        !Number.isFinite(currentX) ||
        !Number.isFinite(currentY) ||
        !Number.isFinite(velocityX) ||
        !Number.isFinite(velocityY)
      ) {
        throw new RangeError('projectile position and velocity must be finite');
      }

      const nextX = currentX + velocityX * deltaSeconds;
      const nextY = currentY + velocityY * deltaSeconds;

      if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) {
        throw new RangeError('projectile position must remain finite');
      }

      world.previousX[slot] = currentX;
      world.previousY[slot] = currentY;
      world.x[slot] = nextX;
      world.y[slot] = nextY;

      const nextLifetime = lifetime - 1;

      if (nextLifetime === 0) {
        world.destroyEntity(world.entityIdOf(slot));
        continue;
      }

      world.lifetimeTicksRemaining[slot] = nextLifetime;
    }
  }

  private fire(
    world: World,
    playerEntity: EntityId,
    target: EntityId,
    playerX: number,
    playerY: number,
    weaponDamage: number,
    projectileRadius: number
  ): void {
    const playerSlot = world.slotOf(playerEntity);
    const targetSlot = world.slotOf(target);
    const targetX = world.x[targetSlot] ?? 0;
    const targetY = world.y[targetSlot] ?? 0;

    let directionX = targetX - playerX;
    let directionY = targetY - playerY;
    let maxAxis = Math.max(Math.abs(directionX), Math.abs(directionY));

    if (maxAxis === 0) {
      directionX = world.lastFacingX[playerSlot] ?? 0;
      directionY = world.lastFacingY[playerSlot] ?? 0;
      maxAxis = Math.max(Math.abs(directionX), Math.abs(directionY));
    }

    if (maxAxis === 0) {
      directionX = DEFAULT_FIRE_DIRECTION_X;
      directionY = DEFAULT_FIRE_DIRECTION_Y;
      maxAxis = 1;
    }

    const scaledX = directionX / maxAxis;
    const scaledY = directionY / maxAxis;
    const inverseScaledMagnitude = 1 / Math.hypot(scaledX, scaledY);
    const velocityX = scaledX * inverseScaledMagnitude * PROJECTILE_SPEED;
    const velocityY = scaledY * inverseScaledMagnitude * PROJECTILE_SPEED;

    if (!Number.isFinite(velocityX) || !Number.isFinite(velocityY)) {
      throw new RangeError('projectile velocity must be finite');
    }

    const projectile = world.createEntity(PROJECTILE_ENTITY_MASK);
    const slot = world.slotOf(projectile);

    world.x[slot] = playerX;
    world.y[slot] = playerY;
    world.previousX[slot] = playerX;
    world.previousY[slot] = playerY;
    world.velocityX[slot] = velocityX;
    world.velocityY[slot] = velocityY;
    world.radius[slot] = projectileRadius;
    world.projectileDamage[slot] = weaponDamage;
    world.lifetimeTicksRemaining[slot] = PROJECTILE_LIFETIME_TICKS;
  }
}
