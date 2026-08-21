import {
  COMBAT_KILL_BUFFER_CAPACITY,
  ENEMY_CONTACT_COOLDOWN_TICKS,
  PLAYER_MAX_HEALTH,
  PLAYER_RADIUS,
} from '@/game-v2/config/Mvp0Config';
import { type CombatStepResult } from '@/game-v2/contracts/CombatStepResult';
import { NO_ENTITY, type EntityId } from '@/game-v2/contracts/EntityId';
import { type StepContext } from '@/game-v2/contracts/StepContext';
import { assertStepContext } from '@/game-v2/systems/StepContextValidator';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { type World } from '@/game-v2/world/World';

/**
 * `step` measures contact overlap against the player's `radius`, so a player
 * without `Body` must fail loudly instead of silently collapsing to a
 * zero-radius hitbox.
 */
const PLAYER_ENTITY_MASK =
  ComponentMask.Transform |
  ComponentMask.Body |
  ComponentMask.Health |
  ComponentMask.Player;

const PLAYER_RESET_MASK = PLAYER_ENTITY_MASK;

const ENEMY_ENTITY_MASK =
  ComponentMask.Transform |
  ComponentMask.Body |
  ComponentMask.Health |
  ComponentMask.Enemy;

const PROJECTILE_ENTITY_MASK =
  ComponentMask.Transform | ComponentMask.Body | ComponentMask.Projectile;

export class CollisionCandidateProvider {
  /**
   * Returns the lowest-slot live enemy colliding with the projectile in `projectileSlot`,
   * or `NO_ENTITY` if no collision occurs.
   */
  public findCollidingEnemy(world: World, projectileSlot: number): EntityId {
    const projMask = world.masks[projectileSlot];
    if (
      projMask === undefined ||
      (projMask & PROJECTILE_ENTITY_MASK) !== PROJECTILE_ENTITY_MASK
    ) {
      throw new RangeError('projectile entity is missing required components');
    }

    const projX = world.x[projectileSlot];
    const projY = world.y[projectileSlot];
    const projRadius = world.radius[projectileSlot];

    if (
      projX === undefined ||
      projY === undefined ||
      projRadius === undefined ||
      !Number.isFinite(projX) ||
      !Number.isFinite(projY) ||
      !Number.isFinite(projRadius) ||
      projRadius < 0
    ) {
      throw new RangeError('projectile position and radius must be finite');
    }

    for (let slot = 0; slot < world.masks.length; slot += 1) {
      const mask = world.masks[slot];
      if (mask === undefined || (mask & ENEMY_ENTITY_MASK) !== ENEMY_ENTITY_MASK) {
        continue;
      }

      const health = world.health[slot] ?? 0;
      if (health <= 0) {
        continue;
      }

      const enemyX = world.x[slot];
      const enemyY = world.y[slot];
      const enemyRadius = world.radius[slot];

      if (
        enemyX === undefined ||
        enemyY === undefined ||
        enemyRadius === undefined ||
        !Number.isFinite(enemyX) ||
        !Number.isFinite(enemyY) ||
        !Number.isFinite(enemyRadius) ||
        enemyRadius < 0
      ) {
        throw new RangeError('enemy position and radius must be finite');
      }

      const combinedRadius = projRadius + enemyRadius;
      const diffX = enemyX - projX;
      const diffY = enemyY - projY;
      const maxAxis = Math.max(Math.abs(diffX), Math.abs(diffY));

      if (maxAxis > combinedRadius) {
        continue;
      }

      const distSq = diffX * diffX + diffY * diffY;
      const combinedRadiusSq = combinedRadius * combinedRadius;

      // Exact touch counts as a hit. The boundary is inclusive on both combat
      // loops and in `TargetingSystem`, so a target that is acquirable at
      // exactly its range is also hittable at exactly its radius.
      if (distSq <= combinedRadiusSq) {
        return world.entityIdOf(slot);
      }
    }

    return NO_ENTITY;
  }
}

export class CombatSystem {
  private readonly candidateProvider: CollisionCandidateProvider;
  private readonly killCapacity: number;
  private readonly result: CombatStepResult;

  public constructor(
    candidateProvider: CollisionCandidateProvider = new CollisionCandidateProvider(),
    killCapacity: number = COMBAT_KILL_BUFFER_CAPACITY
  ) {
    if (!Number.isSafeInteger(killCapacity) || killCapacity <= 0) {
      throw new RangeError('killCapacity must be a positive safe integer');
    }

    this.candidateProvider = candidateProvider;
    this.killCapacity = killCapacity;
    this.result = {
      playerDied: false,
      killCount: 0,
      killX: new Float32Array(killCapacity),
      killY: new Float32Array(killCapacity),
      killXp: new Float32Array(killCapacity),
    };
  }

  /**
   * Initializes the player's combat-owned fields for a new run.
   *
   * `PLAYER_MAX_HEALTH` and `PLAYER_RADIUS` have no other writer in `game-v2/**`,
   * so without this the player would enter every run with the zeroed slot values
   * and `step` would latch `playerDied` on its first call. Mirrors
   * `DashSystem.resetPlayer` and `WeaponSystem.resetPlayer`; V2-014 composition
   * calls all three.
   */
  public resetPlayer(world: World, playerEntity: EntityId): void {
    const slot = world.slotOf(playerEntity);
    const mask = world.masks[slot];

    if (mask === undefined || (mask & PLAYER_RESET_MASK) !== PLAYER_RESET_MASK) {
      throw new RangeError('player entity is missing required components');
    }

    world.health[slot] = PLAYER_MAX_HEALTH;
    world.maxHealth[slot] = PLAYER_MAX_HEALTH;
    world.radius[slot] = PLAYER_RADIUS;
  }

  /**
   * Resolves one tick of combat.
   *
   * The system keeps no per-run state of its own: `playerDied` is the edge
   * between the player's health at step entry and its health after this tick's
   * damage, so a checkpoint restore that rewinds `World` rewinds the death
   * signal with it. Nothing here has to be reset between runs.
   */
  public step(
    world: World,
    playerEntity: EntityId,
    context: StepContext
  ): CombatStepResult {
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
    const playerHealth = world.health[playerSlot];
    const playerRadius = world.radius[playerSlot] ?? 0;
    const playerMaxHealth = world.maxHealth[playerSlot] ?? 0;

    if (
      playerX === undefined ||
      playerY === undefined ||
      playerHealth === undefined ||
      !Number.isFinite(playerX) ||
      !Number.isFinite(playerY) ||
      !Number.isFinite(playerHealth) ||
      !Number.isFinite(playerRadius) ||
      playerRadius < 0
    ) {
      throw new RangeError('player state must be finite');
    }

    // A player whose max health is still zero never went through `resetPlayer`.
    // Deriving the death edge from health would report that player as alive
    // forever, so the missing initializer must fail loudly here instead.
    if (playerMaxHealth <= 0) {
      throw new RangeError('player was not initialized by resetPlayer');
    }

    const wasAliveAtEntry = playerHealth > 0;

    // Reset result fields without reallocating objects or typed arrays
    this.result.playerDied = false;
    this.result.killCount = 0;

    // 1. Projectile-to-enemy collisions
    this.resolveProjectiles(world);

    // 2. Enemy-to-player contact damage
    this.resolveContactDamage(world, playerSlot, playerX, playerY, playerRadius);

    // 3. Player death edge
    const finalPlayerHealth = world.health[playerSlot] ?? 0;
    this.result.playerDied = wasAliveAtEntry && finalPlayerHealth <= 0;

    return this.result;
  }

  private resolveProjectiles(world: World): void {
    for (let slot = 0; slot < world.masks.length; slot += 1) {
      const mask = world.masks[slot];
      if (
        mask === undefined ||
        (mask & PROJECTILE_ENTITY_MASK) !== PROJECTILE_ENTITY_MASK
      ) {
        continue;
      }

      const targetEnemy = this.candidateProvider.findCollidingEnemy(world, slot);
      if (targetEnemy === NO_ENTITY) {
        continue;
      }

      const enemySlot = world.slotOf(targetEnemy);
      const projectileDamage = world.projectileDamage[slot] ?? 0;
      const currentEnemyHealth = world.health[enemySlot] ?? 0;
      const nextEnemyHealth = currentEnemyHealth - projectileDamage;
      const isLethal = nextEnemyHealth <= 0;

      // Reject before any mutation: a throw after the health write would leave a
      // damaged-but-undestroyed enemy behind.
      if (isLethal && this.result.killCount >= this.killCapacity) {
        throw new RangeError('combat kill buffer capacity exceeded');
      }

      world.health[enemySlot] = nextEnemyHealth;

      if (isLethal) {
        const killX = world.x[enemySlot] ?? 0;
        const killY = world.y[enemySlot] ?? 0;
        const killXp = world.xpValue[enemySlot] ?? 0;
        const killIndex = this.result.killCount;
        this.result.killX[killIndex] = killX;
        this.result.killY[killIndex] = killY;
        this.result.killXp[killIndex] = killXp;
        this.result.killCount += 1;

        world.destroyEntity(targetEnemy);
      }

      world.destroyEntity(world.entityIdOf(slot));
    }
  }

  private resolveContactDamage(
    world: World,
    playerSlot: number,
    playerX: number,
    playerY: number,
    playerRadius: number
  ): void {
    const isInvulnerable = (world.invulnerabilityTicksRemaining[playerSlot] ?? 0) > 0;

    for (let slot = 0; slot < world.masks.length; slot += 1) {
      const mask = world.masks[slot];
      if (mask === undefined || (mask & ENEMY_ENTITY_MASK) !== ENEMY_ENTITY_MASK) {
        continue;
      }

      const enemyX = world.x[slot];
      const enemyY = world.y[slot];
      const enemyRadius = world.radius[slot];

      // Validated before the cooldown is touched, so a corrupt enemy rejects
      // without having mutated anything. A `NaN` coordinate would otherwise
      // fail every overlap rejection below and damage the player from any
      // distance, which is the opposite of how `findCollidingEnemy` treats the
      // same input.
      if (
        enemyX === undefined ||
        enemyY === undefined ||
        enemyRadius === undefined ||
        !Number.isFinite(enemyX) ||
        !Number.isFinite(enemyY) ||
        !Number.isFinite(enemyRadius) ||
        enemyRadius < 0
      ) {
        throw new RangeError('enemy position and radius must be finite');
      }

      const currentCooldown = world.contactCooldownTicksRemaining[slot] ?? 0;
      let nextCooldown = currentCooldown;

      // The cooldown advances even while the player is invulnerable: dashing
      // through a mob buys distance, not a frozen attack cadence.
      if (nextCooldown > 0) {
        nextCooldown -= 1;
        world.contactCooldownTicksRemaining[slot] = nextCooldown;
      }

      if (nextCooldown > 0) {
        continue;
      }

      const combinedRadius = playerRadius + enemyRadius;
      const diffX = enemyX - playerX;
      const diffY = enemyY - playerY;
      const maxAxis = Math.max(Math.abs(diffX), Math.abs(diffY));

      if (maxAxis > combinedRadius) {
        continue;
      }

      const distSq = diffX * diffX + diffY * diffY;
      const combinedRadiusSq = combinedRadius * combinedRadius;

      if (distSq > combinedRadiusSq) {
        continue;
      }

      if (isInvulnerable) {
        continue;
      }

      const contactDamage = world.contactDamage[slot] ?? 0;
      const currentHealth = world.health[playerSlot] ?? 0;
      const nextHealth = Math.max(0, currentHealth - contactDamage);
      world.health[playerSlot] = nextHealth;
      world.contactCooldownTicksRemaining[slot] = ENEMY_CONTACT_COOLDOWN_TICKS;
    }
  }
}
