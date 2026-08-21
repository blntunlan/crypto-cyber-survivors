import { WEAPON_RANGE } from '@/game-v2/config/Mvp0Config';
import { NO_ENTITY, type EntityId } from '@/game-v2/contracts/EntityId';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { type World } from '@/game-v2/world/World';

const PLAYER_ENTITY_MASK = ComponentMask.Transform | ComponentMask.Player;

/**
 * Candidates must own every listed bit. `Health` is required so liveness can be
 * gated without a second lookup, matching `EnemySystem`'s all-bit precedent.
 */
const CANDIDATE_ENTITY_MASK =
  ComponentMask.Transform | ComponentMask.Enemy | ComponentMask.Health;

const WEAPON_RANGE_SQUARED = WEAPON_RANGE * WEAPON_RANGE;

const isCandidate = (mask: number | undefined): boolean =>
  mask !== undefined && (mask & CANDIDATE_ENTITY_MASK) === CANDIDATE_ENTITY_MASK;

export class TargetingSystem {
  /**
   * Returns the nearest live enemy inside `WEAPON_RANGE`, or `NO_ENTITY`.
   *
   * Selection is read-only, allocation-free, and consumes no randomness. Exact
   * squared-distance ties resolve to the lowest slot because the scan runs in
   * ascending slot order behind a strictly-less-than comparison.
   *
   * The range boundary is inclusive: an enemy at exactly `WEAPON_RANGE` is a
   * valid target.
   */
  public findNearestTarget(world: World, playerEntity: EntityId): EntityId {
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

    if (
      playerX === undefined ||
      playerY === undefined ||
      !Number.isFinite(playerX) ||
      !Number.isFinite(playerY)
    ) {
      throw new RangeError('player position must be finite');
    }

    for (let slot = 0; slot < world.masks.length; slot += 1) {
      if (!isCandidate(world.masks[slot])) {
        continue;
      }

      const candidateX = world.x[slot];
      const candidateY = world.y[slot];
      const candidateHealth = world.health[slot];

      if (
        candidateX === undefined ||
        candidateY === undefined ||
        candidateHealth === undefined ||
        !Number.isFinite(candidateX) ||
        !Number.isFinite(candidateY) ||
        !Number.isFinite(candidateHealth)
      ) {
        throw new RangeError('enemy position and health must be finite');
      }
    }

    let bestSlot = -1;
    let bestDistanceSquared = Number.POSITIVE_INFINITY;

    for (let slot = 0; slot < world.masks.length; slot += 1) {
      if (!isCandidate(world.masks[slot])) {
        continue;
      }

      if ((world.health[slot] ?? 0) <= 0) {
        continue;
      }

      const differenceX = playerX - (world.x[slot] ?? 0);
      const differenceY = playerY - (world.y[slot] ?? 0);
      const maxAxis = Math.max(Math.abs(differenceX), Math.abs(differenceY));

      // The true distance is never smaller than the larger axis, so rejecting on
      // the max axis first keeps the squared term bounded by 2 * range^2 even
      // when both entities sit near the Float32 coordinate limit.
      if (maxAxis > WEAPON_RANGE) {
        continue;
      }

      const distanceSquared = differenceX * differenceX + differenceY * differenceY;

      if (distanceSquared > WEAPON_RANGE_SQUARED) {
        continue;
      }

      if (distanceSquared < bestDistanceSquared) {
        bestDistanceSquared = distanceSquared;
        bestSlot = slot;
      }
    }

    if (bestSlot < 0) {
      return NO_ENTITY;
    }

    return world.entityIdOf(bestSlot);
  }
}
