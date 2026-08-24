import { ENEMY_FACTION } from '@/game-v2/config/Mvp0Config';
import { GRUNT_ENEMY } from '@/game-v2/config/EnemyRegistry';
import { type EntityId } from '@/game-v2/contracts/EntityId';
import { type EnemyDefinition } from '@/game-v2/contracts/EnemyArchetype';
import {
  TELEGRAPH_BEHAVIOR_BLOATER,
  TELEGRAPH_BEHAVIOR_CHARGER,
  TELEGRAPH_BEHAVIOR_NONE,
  TELEGRAPH_BEHAVIOR_SNIPER,
  TELEGRAPH_PHASE_ACTIVE,
  TELEGRAPH_PHASE_READY,
  TELEGRAPH_PHASE_TELEGRAPHING,
} from '@/game-v2/contracts/EnemyTelegraphState';
import { type DeterministicRng } from '@/game-v2/runtime/DeterministicRng';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { type World } from '@/game-v2/world/World';

export type EnemySpawnRequest =
  | Readonly<{
      type: 'point';
      x: number;
      y: number;
    }>
  | Readonly<{
      type: 'ring';
      centerX: number;
      centerY: number;
      radius: number;
    }>;

const ENEMY_ENTITY_MASK =
  ComponentMask.Transform |
  ComponentMask.Velocity |
  ComponentMask.Body |
  ComponentMask.Health |
  ComponentMask.Faction |
  ComponentMask.Enemy;

const CHASE_ENTITY_MASK =
  ComponentMask.Transform | ComponentMask.Velocity | ComponentMask.Enemy;

const PLAYER_ENTITY_MASK = ComponentMask.Transform | ComponentMask.Player;
const FULL_CIRCLE_RADIANS = Math.PI * 2;

const assertFiniteCoordinate = (value: number): void => {
  if (!Number.isFinite(value) || !Number.isFinite(Math.fround(value))) {
    throw new RangeError('enemy coordinates must be finite ECS values');
  }
};

function assertSpawnRequest(request: unknown): asserts request is EnemySpawnRequest {
  if (request === null || typeof request !== 'object') {
    throw new TypeError('enemy spawn request must be an object');
  }

  const candidate = request as {
    type?: unknown;
    x?: unknown;
    y?: unknown;
    centerX?: unknown;
    centerY?: unknown;
    radius?: unknown;
  };

  if (candidate.type === 'point') {
    if (typeof candidate.x !== 'number' || typeof candidate.y !== 'number') {
      throw new TypeError('point coordinates must be numbers');
    }
    assertFiniteCoordinate(candidate.x);
    assertFiniteCoordinate(candidate.y);
    return;
  }

  if (candidate.type === 'ring') {
    if (
      typeof candidate.centerX !== 'number' ||
      typeof candidate.centerY !== 'number' ||
      typeof candidate.radius !== 'number' ||
      !Number.isFinite(candidate.centerX) ||
      !Number.isFinite(candidate.centerY) ||
      !Number.isFinite(candidate.radius) ||
      candidate.radius < 0
    ) {
      throw new RangeError(
        'ring center must be finite and radius must be finite and non-negative'
      );
    }

    assertFiniteCoordinate(candidate.centerX + candidate.radius);
    assertFiniteCoordinate(candidate.centerX - candidate.radius);
    assertFiniteCoordinate(candidate.centerY + candidate.radius);
    assertFiniteCoordinate(candidate.centerY - candidate.radius);
    return;
  }

  throw new TypeError('unknown enemy spawn request type');
}

const assertMask = (
  mask: number | undefined,
  requiredMask: number,
  message: string
): void => {
  if (mask === undefined || (mask & requiredMask) !== requiredMask) {
    throw new RangeError(message);
  }
};

const isChaseEnemy = (mask: number | undefined): boolean =>
  mask !== undefined && (mask & CHASE_ENTITY_MASK) === CHASE_ENTITY_MASK;

export class EnemySystem {
  public spawnEnemy(
    world: World,
    rng: Pick<DeterministicRng, 'nextFloat'>,
    request: EnemySpawnRequest,
    /**
     * Defaults to `grunt` (`V2-108`) so every pre-`V2-108` caller — the
     * production spawn cadence before `EnemyComposer` existed, and the many
     * tests that call `spawnEnemy` directly — produces byte-for-byte
     * identical entity state without passing anything new.
     */
    definition: EnemyDefinition = GRUNT_ENEMY
  ): EntityId {
    assertSpawnRequest(request);

    if (world.freeSlotCount === 0) {
      throw new RangeError('entity capacity exhausted');
    }

    let spawnX: number;
    let spawnY: number;

    if (request.type === 'point') {
      spawnX = request.x;
      spawnY = request.y;
    } else {
      const angleSample = rng.nextFloat();

      if (!Number.isFinite(angleSample) || angleSample < 0 || angleSample >= 1) {
        throw new RangeError('ring RNG sample must be in [0, 1)');
      }

      const angle = angleSample * FULL_CIRCLE_RADIANS;
      spawnX = request.centerX + Math.cos(angle) * request.radius;
      spawnY = request.centerY + Math.sin(angle) * request.radius;
      assertFiniteCoordinate(spawnX);
      assertFiniteCoordinate(spawnY);
    }

    const enemy = world.createEntity(ENEMY_ENTITY_MASK);
    const slot = world.slotOf(enemy);

    world.x[slot] = spawnX;
    world.y[slot] = spawnY;
    world.previousX[slot] = spawnX;
    world.previousY[slot] = spawnY;
    world.velocityX[slot] = 0;
    world.velocityY[slot] = 0;
    world.radius[slot] = definition.radius;
    world.health[slot] = definition.health;
    world.maxHealth[slot] = definition.health;
    world.faction[slot] = ENEMY_FACTION;
    world.enemySpeed[slot] = definition.moveSpeed;
    world.contactDamage[slot] = definition.contactDamage;
    world.contactCooldownTicksRemaining[slot] = 0;
    world.xpValue[slot] = definition.xpValue;
    this.writeTelegraphProfile(world, slot, definition);

    return enemy;
  }

  /**
   * Flattens `definition.telegraph`'s discriminated union into the
   * shared `World` columns every archetype writes into regardless of
   * `behavior` (V2-ADR-164) — irrelevant fields for a given behavior
   * are left at their default `0`. Always starts `READY` with no
   * pending timer.
   */
  private writeTelegraphProfile(
    world: World,
    slot: number,
    definition: EnemyDefinition
  ): void {
    const telegraph = definition.telegraph;

    world.enemyTelegraphPhase[slot] = TELEGRAPH_PHASE_READY;
    world.enemyTelegraphTicksRemaining[slot] = 0;
    world.enemyTelegraphAimX[slot] = 0;
    world.enemyTelegraphAimY[slot] = 0;

    if (telegraph.behavior === 'none') {
      world.enemyTelegraphBehavior[slot] = TELEGRAPH_BEHAVIOR_NONE;
      return;
    }

    if (telegraph.behavior === 'charger') {
      world.enemyTelegraphBehavior[slot] = TELEGRAPH_BEHAVIOR_CHARGER;
      world.enemyTelegraphDurationTicks[slot] = telegraph.telegraphTicks;
      world.enemyTelegraphActiveDurationTicks[slot] = telegraph.activeTicks;
      world.enemyTelegraphCooldownTicks[slot] = telegraph.cooldownTicks;
      world.enemyTelegraphDashSpeed[slot] = telegraph.dashSpeed;
      world.enemyTelegraphEffectRange[slot] = telegraph.triggerRange;
      return;
    }

    if (telegraph.behavior === 'bloater') {
      world.enemyTelegraphBehavior[slot] = TELEGRAPH_BEHAVIOR_BLOATER;
      world.enemyTelegraphDurationTicks[slot] = telegraph.telegraphTicks;
      world.enemyTelegraphEffectDamage[slot] = telegraph.burstDamage;
      world.enemyTelegraphEffectRadius[slot] = telegraph.burstRadius;
      return;
    }

    world.enemyTelegraphBehavior[slot] = TELEGRAPH_BEHAVIOR_SNIPER;
    world.enemyTelegraphDurationTicks[slot] = telegraph.telegraphTicks;
    world.enemyTelegraphActiveDurationTicks[slot] = telegraph.activeTicks;
    world.enemyTelegraphCooldownTicks[slot] = telegraph.cooldownTicks;
    world.enemyTelegraphEffectDamage[slot] = telegraph.lineDamage;
    world.enemyTelegraphEffectRadius[slot] = telegraph.lineTolerance;
    world.enemyTelegraphEffectRange[slot] = telegraph.lineRange;
  }

  public step(world: World, playerEntity: EntityId, deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      throw new RangeError('delta seconds must be positive and finite');
    }

    const playerSlot = world.slotOf(playerEntity);
    assertMask(
      world.masks[playerSlot],
      PLAYER_ENTITY_MASK,
      'player entity is missing required components'
    );
    const playerX = world.x[playerSlot];
    const playerY = world.y[playerSlot];

    if (
      playerX === undefined ||
      playerY === undefined ||
      !Number.isFinite(playerX) ||
      !Number.isFinite(playerY)
    ) {
      throw new RangeError('player position must be finite');
    }

    for (let slot = 0; slot < world.masks.length; slot += 1) {
      if (!isChaseEnemy(world.masks[slot])) {
        continue;
      }

      const currentX = world.x[slot];
      const currentY = world.y[slot];
      const speed = world.enemySpeed[slot];

      if (
        currentX === undefined ||
        currentY === undefined ||
        speed === undefined ||
        !Number.isFinite(currentX) ||
        !Number.isFinite(currentY) ||
        !Number.isFinite(speed) ||
        speed < 0
      ) {
        throw new RangeError('enemy position and speed must be finite and valid');
      }
    }

    for (let slot = 0; slot < world.masks.length; slot += 1) {
      if (!isChaseEnemy(world.masks[slot])) {
        continue;
      }

      const currentX = world.x[slot] ?? 0;
      const currentY = world.y[slot] ?? 0;
      const behavior = world.enemyTelegraphBehavior[slot] ?? TELEGRAPH_BEHAVIOR_NONE;
      const phase = world.enemyTelegraphPhase[slot] ?? TELEGRAPH_PHASE_READY;

      // A telegraphed archetype holds still while telegraphing, and only
      // `charger` moves (at its dash speed) during `ACTIVE` — `bloater`/
      // `sniper` resolve instantly and do not move (V2-300).
      let speed = world.enemySpeed[slot] ?? 0;
      let holdRange = 0;

      if (phase === TELEGRAPH_PHASE_TELEGRAPHING) {
        speed = 0;
      } else if (phase === TELEGRAPH_PHASE_ACTIVE) {
        speed =
          behavior === TELEGRAPH_BEHAVIOR_CHARGER
            ? (world.enemyTelegraphDashSpeed[slot] ?? 0)
            : 0;
      } else if (behavior === TELEGRAPH_BEHAVIOR_SNIPER) {
        // Holds at its own engage range rather than closing to contact.
        holdRange = world.enemyTelegraphEffectRange[slot] ?? 0;
      }

      const differenceX = playerX - currentX;
      const differenceY = playerY - currentY;
      const maxAxis = Math.max(Math.abs(differenceX), Math.abs(differenceY));

      world.previousX[slot] = currentX;
      world.previousY[slot] = currentY;

      if (maxAxis === 0 || speed === 0) {
        world.velocityX[slot] = 0;
        world.velocityY[slot] = 0;
        continue;
      }

      const scaledX = differenceX / maxAxis;
      const scaledY = differenceY / maxAxis;
      const scaledDistance = Math.hypot(scaledX, scaledY);
      const directionX = scaledX / scaledDistance;
      const directionY = scaledY / scaledDistance;
      const trueDistance = maxAxis * scaledDistance;
      // `holdRange` is always `0` for every archetype but `sniper`, so this
      // is a bit-identical no-op (`Math.max(0, trueDistance - 0)`) for
      // every pre-`V2-300` archetype.
      const remainingDistance = Math.max(0, trueDistance - holdRange);

      if (remainingDistance === 0) {
        world.velocityX[slot] = 0;
        world.velocityY[slot] = 0;
        continue;
      }

      const travelDistance = Math.min(speed * deltaSeconds, remainingDistance);

      world.velocityX[slot] = directionX * speed;
      world.velocityY[slot] = directionY * speed;

      if (travelDistance >= remainingDistance) {
        if (holdRange === 0) {
          // Bit-identical to the pre-`V2-300` snap-to-player assignment.
          world.x[slot] = playerX;
          world.y[slot] = playerY;
        } else {
          world.x[slot] = currentX + directionX * remainingDistance;
          world.y[slot] = currentY + directionY * remainingDistance;
        }
      } else {
        world.x[slot] = currentX + directionX * travelDistance;
        world.y[slot] = currentY + directionY * travelDistance;
      }
    }
  }

  public releaseEnemy(world: World, enemyEntity: EntityId): void {
    const slot = world.slotOf(enemyEntity);
    assertMask(
      world.masks[slot],
      ENEMY_ENTITY_MASK,
      'enemy entity is missing required components'
    );
    world.destroyEntity(enemyEntity);
  }
}
