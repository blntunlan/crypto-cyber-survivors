import {
  ENEMY_CONTACT_DAMAGE,
  ENEMY_FACTION,
  ENEMY_HEALTH,
  ENEMY_MOVE_SPEED,
  ENEMY_RADIUS,
  ENEMY_XP_VALUE,
} from '@/game-v2/config/Mvp0Config';
import { type EntityId } from '@/game-v2/contracts/EntityId';
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
    request: EnemySpawnRequest
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
    world.radius[slot] = ENEMY_RADIUS;
    world.health[slot] = ENEMY_HEALTH;
    world.maxHealth[slot] = ENEMY_HEALTH;
    world.faction[slot] = ENEMY_FACTION;
    world.enemySpeed[slot] = ENEMY_MOVE_SPEED;
    world.contactDamage[slot] = ENEMY_CONTACT_DAMAGE;
    world.contactCooldownTicksRemaining[slot] = 0;
    world.xpValue[slot] = ENEMY_XP_VALUE;

    return enemy;
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
      const speed = world.enemySpeed[slot] ?? 0;
      const differenceX = playerX - currentX;
      const differenceY = playerY - currentY;
      const maxAxis = Math.max(Math.abs(differenceX), Math.abs(differenceY));

      world.previousX[slot] = currentX;
      world.previousY[slot] = currentY;

      if (maxAxis === 0) {
        world.velocityX[slot] = 0;
        world.velocityY[slot] = 0;
        continue;
      }

      const scaledX = differenceX / maxAxis;
      const scaledY = differenceY / maxAxis;
      const scaledDistance = Math.hypot(scaledX, scaledY);
      const directionX = scaledX / scaledDistance;
      const directionY = scaledY / scaledDistance;
      const remainingDistance = maxAxis * scaledDistance;
      const travelDistance = Math.min(speed * deltaSeconds, remainingDistance);

      world.velocityX[slot] = directionX * speed;
      world.velocityY[slot] = directionY * speed;

      if (travelDistance >= remainingDistance) {
        world.x[slot] = playerX;
        world.y[slot] = playerY;
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
