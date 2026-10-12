import {
  type RenderCategorySnapshot,
  type RenderSnapshot,
} from '@/game-v2/contracts/RenderSnapshot';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { type World } from '@/game-v2/world/World';
import { validateRenderCategoryStorage } from '@/game-v2/presentation/RenderSnapshotValidator';

const PLAYER_MASK = ComponentMask.Transform | ComponentMask.Player;
const ENEMY_MASK = ComponentMask.Transform | ComponentMask.Enemy;
const PROJECTILE_MASK = ComponentMask.Transform | ComponentMask.Projectile;
const XP_PICKUP_MASK = ComponentMask.Transform | ComponentMask.XpPickup;

const hasAllBits = (actual: number, required: number): boolean =>
  (actual & required) === required;

const assertFiniteTransform = (world: World, slot: number): void => {
  const previousX = world.previousX[slot];
  const previousY = world.previousY[slot];
  const currentX = world.x[slot];
  const currentY = world.y[slot];
  const radius = world.radius[slot];

  if (
    !Number.isFinite(previousX) ||
    !Number.isFinite(previousY) ||
    !Number.isFinite(currentX) ||
    !Number.isFinite(currentY) ||
    !Number.isFinite(radius)
  ) {
    throw new RangeError('render transform values must be finite');
  }
  if ((radius ?? -1) < 0) {
    throw new RangeError('render radius must not be negative');
  }
};

const copyTransform = (
  world: World,
  slot: number,
  category: RenderCategorySnapshot,
  index: number
): void => {
  category.slots[index] = slot;
  category.previousX[index] = world.previousX[slot] ?? 0;
  category.previousY[index] = world.previousY[slot] ?? 0;
  category.currentX[index] = world.x[slot] ?? 0;
  category.currentY[index] = world.y[slot] ?? 0;
  category.radius[index] = world.radius[slot] ?? 0;
};

export class RenderSnapshotWriter {
  public write(world: World, output: RenderSnapshot): void {
    const playerCapacity = validateRenderCategoryStorage(output.player, 'player');
    const enemyCapacity = validateRenderCategoryStorage(output.enemies, 'enemy');
    const projectileCapacity = validateRenderCategoryStorage(
      output.projectiles,
      'projectile'
    );
    const xpPickupCapacity = validateRenderCategoryStorage(
      output.xpPickups,
      'XP pickup'
    );
    if (playerCapacity !== 1) {
      throw new RangeError('player storage capacity must be exactly one');
    }
    let playerCount = 0;
    let enemyCount = 0;
    let projectileCount = 0;
    let xpPickupCount = 0;

    for (let slot = 0; slot < world.masks.length; slot += 1) {
      const mask = world.masks[slot] ?? 0;
      if (hasAllBits(mask, PLAYER_MASK)) {
        playerCount += 1;
        if (playerCount > playerCapacity) {
          throw new RangeError('render snapshot supports at most one player');
        }
        assertFiniteTransform(world, slot);
      }
      if (hasAllBits(mask, ENEMY_MASK)) {
        enemyCount += 1;
        if (enemyCount > enemyCapacity) {
          throw new RangeError('enemy render snapshot capacity exceeded');
        }
        assertFiniteTransform(world, slot);
      }
      if (hasAllBits(mask, PROJECTILE_MASK)) {
        projectileCount += 1;
        if (projectileCount > projectileCapacity) {
          throw new RangeError('projectile render snapshot capacity exceeded');
        }
        assertFiniteTransform(world, slot);
      }
      if (hasAllBits(mask, XP_PICKUP_MASK)) {
        xpPickupCount += 1;
        if (xpPickupCount > xpPickupCapacity) {
          throw new RangeError('XP pickup render snapshot capacity exceeded');
        }
        assertFiniteTransform(world, slot);
      }
    }

    let playerIndex = 0;
    let enemyIndex = 0;
    let projectileIndex = 0;
    let xpPickupIndex = 0;
    for (let slot = 0; slot < world.masks.length; slot += 1) {
      const mask = world.masks[slot] ?? 0;
      if (hasAllBits(mask, PLAYER_MASK)) {
        copyTransform(world, slot, output.player, playerIndex);
        playerIndex += 1;
      }
      if (hasAllBits(mask, ENEMY_MASK)) {
        copyTransform(world, slot, output.enemies, enemyIndex);
        enemyIndex += 1;
      }
      if (hasAllBits(mask, PROJECTILE_MASK)) {
        copyTransform(world, slot, output.projectiles, projectileIndex);
        projectileIndex += 1;
      }
      if (hasAllBits(mask, XP_PICKUP_MASK)) {
        copyTransform(world, slot, output.xpPickups, xpPickupIndex);
        xpPickupIndex += 1;
      }
    }

    output.playerCount = playerCount;
    output.enemyCount = enemyCount;
    output.projectileCount = projectileCount;
    output.xpPickupCount = xpPickupCount;
  }
}
