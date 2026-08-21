import { PLAYER_MOVE_SPEED } from '@/game-v2/config/Mvp0Config';
import { type EntityId } from '@/game-v2/contracts/EntityId';
import { type StepContext } from '@/game-v2/contracts/StepContext';
import { assertStepContext } from '@/game-v2/systems/StepContextValidator';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { type World } from '@/game-v2/world/World';

const REQUIRED_PLAYER_MASK =
  ComponentMask.Transform | ComponentMask.Velocity | ComponentMask.Player;

const assertPlayerMask = (mask: number | undefined): void => {
  if (mask === undefined || (mask & REQUIRED_PLAYER_MASK) !== REQUIRED_PLAYER_MASK) {
    throw new RangeError('player entity is missing required components');
  }
};

export class MovementSystem {
  public step(world: World, playerEntity: EntityId, context: StepContext): void {
    assertStepContext(context);
    const slot = world.slotOf(playerEntity);
    const mask = world.masks[slot];
    assertPlayerMask(mask);

    const currentX = world.x[slot];
    const currentY = world.y[slot];
    const movementOverride = world.movementOverride[slot];

    if (
      currentX === undefined ||
      currentY === undefined ||
      movementOverride === undefined ||
      !Number.isFinite(currentX) ||
      !Number.isFinite(currentY)
    ) {
      throw new RangeError('player position must be finite');
    }

    if (movementOverride === 1) {
      const velocityX = world.velocityX[slot];
      const velocityY = world.velocityY[slot];
      const dashRemainingSeconds = world.dashRemainingSeconds[slot];

      if (
        velocityX === undefined ||
        velocityY === undefined ||
        dashRemainingSeconds === undefined ||
        !Number.isFinite(velocityX) ||
        !Number.isFinite(velocityY) ||
        !Number.isFinite(dashRemainingSeconds) ||
        dashRemainingSeconds < 0
      ) {
        throw new RangeError('dash velocity and remaining time must be finite');
      }

      const integrationSeconds = Math.min(context.deltaSeconds, dashRemainingSeconds);
      const nextX = currentX + velocityX * integrationSeconds;
      const nextY = currentY + velocityY * integrationSeconds;

      if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) {
        throw new RangeError('dash position must remain finite');
      }

      const nextRemainingSeconds =
        dashRemainingSeconds <= context.deltaSeconds
          ? 0
          : dashRemainingSeconds - integrationSeconds;

      world.previousX[slot] = currentX;
      world.previousY[slot] = currentY;
      world.x[slot] = nextX;
      world.y[slot] = nextY;
      world.dashRemainingSeconds[slot] = nextRemainingSeconds;

      if (nextRemainingSeconds === 0) {
        world.movementOverride[slot] = 0;
        world.velocityX[slot] = 0;
        world.velocityY[slot] = 0;
      }
      return;
    }

    const moveX = context.intent.moveX;
    const moveY = context.intent.moveY;

    let movementX = moveX;
    let movementY = moveY;
    let facingX = 0;
    let facingY = 0;
    const maxAxis = Math.max(Math.abs(moveX), Math.abs(moveY));

    if (maxAxis > 0) {
      const scaledX = moveX / maxAxis;
      const scaledY = moveY / maxAxis;
      const scaledMagnitude = Math.hypot(scaledX, scaledY);
      const inverseScaledMagnitude = 1 / scaledMagnitude;
      facingX = scaledX * inverseScaledMagnitude;
      facingY = scaledY * inverseScaledMagnitude;

      if (maxAxis * scaledMagnitude > 1) {
        movementX = facingX;
        movementY = facingY;
      }
    }

    const velocityX = movementX * PLAYER_MOVE_SPEED;
    const velocityY = movementY * PLAYER_MOVE_SPEED;
    const nextX = currentX + velocityX * context.deltaSeconds;
    const nextY = currentY + velocityY * context.deltaSeconds;

    if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) {
      throw new RangeError('player position must remain finite');
    }

    world.previousX[slot] = currentX;
    world.previousY[slot] = currentY;
    world.velocityX[slot] = velocityX;
    world.velocityY[slot] = velocityY;
    world.x[slot] = nextX;
    world.y[slot] = nextY;

    if (maxAxis > 0) {
      world.lastFacingX[slot] = facingX;
      world.lastFacingY[slot] = facingY;
    }
  }
}
