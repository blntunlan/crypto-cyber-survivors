import {
  PROJECTILE_LIFETIME_TICKS,
  PROJECTILE_RADIUS,
  PROJECTILE_SPEED,
  STARTER_PROJECTILE_DAMAGE_BY_TIER,
  WEAPON_COOLDOWN_TICKS,
} from '@/game-v2/config/Mvp0Config';
import { STARTER_PROJECTILE } from '@/game-v2/config/AbilityRegistry';
import {
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

const isProjectile = (mask: number | undefined): boolean =>
  mask !== undefined && (mask & PROJECTILE_ENTITY_MASK) === PROJECTILE_ENTITY_MASK;

export class WeaponSystem {
  private readonly targetingSystem: TargetingSystem;
  private readonly loadout: AbilityLoadoutSystem;

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

    world.weaponCooldownTicksRemaining[slot] = 0;
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

    return this.starterDamage(world, playerEntity);
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
    const index = this.loadout.indexOf(world, playerEntity, STARTER_PROJECTILE.id);

    if (index === null) {
      throw new RangeError('player holds no starter weapon');
    }

    return index;
  }

  /**
   * Reads authored damage for the tier the loadout currently holds.
   *
   * A tier with no authored damage throws instead of silently firing tier-1
   * damage: the loadout ceiling should make it unreachable, and a restored or
   * hand-written checkpoint that breaks that invariant must fail loudly.
   */
  private starterDamage(world: World, playerEntity: EntityId): number {
    const tier = this.loadout.tierAt(
      world,
      playerEntity,
      this.starterSlotIndex(world, playerEntity)
    );

    if (tier === null) {
      throw new RangeError('player holds no starter weapon');
    }

    const damage = STARTER_PROJECTILE_DAMAGE_BY_TIER[tier - 1];

    if (damage === undefined) {
      throw new RangeError('starter weapon tier has no authored damage');
    }

    return damage;
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
    const weaponDamage = this.starterDamage(world, playerEntity);
    const lastFacingX = world.lastFacingX[playerSlot];
    const lastFacingY = world.lastFacingY[playerSlot];

    if (
      playerX === undefined ||
      playerY === undefined ||
      lastFacingX === undefined ||
      lastFacingY === undefined ||
      !Number.isFinite(playerX) ||
      !Number.isFinite(playerY) ||
      !Number.isFinite(weaponDamage) ||
      weaponDamage < 0 ||
      !Number.isFinite(lastFacingX) ||
      !Number.isFinite(lastFacingY)
    ) {
      throw new RangeError('player weapon state must be finite');
    }

    let nextCooldown = world.weaponCooldownTicksRemaining[playerSlot] ?? 0;

    if (nextCooldown > 0) {
      nextCooldown -= 1;
    }

    let target: EntityId = NO_ENTITY;

    if (nextCooldown === 0) {
      target = this.targetingSystem.findNearestTarget(world, playerEntity);

      if (target !== NO_ENTITY && world.freeSlotCount === 0) {
        throw new RangeError('entity capacity exhausted');
      }
    }

    this.advanceProjectiles(world, context.deltaSeconds);

    if (target !== NO_ENTITY) {
      this.fire(world, playerEntity, target, playerX, playerY, weaponDamage);
      nextCooldown = WEAPON_COOLDOWN_TICKS;
    }

    world.weaponCooldownTicksRemaining[playerSlot] = nextCooldown;
  }

  private advanceProjectiles(world: World, deltaSeconds: number): void {
    for (let slot = 0; slot < world.masks.length; slot += 1) {
      if (!isProjectile(world.masks[slot])) {
        continue;
      }

      const lifetime = world.projectileLifetimeTicksRemaining[slot] ?? 0;

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

      world.projectileLifetimeTicksRemaining[slot] = nextLifetime;
    }
  }

  private fire(
    world: World,
    playerEntity: EntityId,
    target: EntityId,
    playerX: number,
    playerY: number,
    weaponDamage: number
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
    world.radius[slot] = PROJECTILE_RADIUS;
    world.projectileDamage[slot] = weaponDamage;
    world.projectileLifetimeTicksRemaining[slot] = PROJECTILE_LIFETIME_TICKS;
  }
}
