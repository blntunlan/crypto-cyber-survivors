import { PLAYER_MOVE_SPEED } from '@/game-v2/config/Mvp0Config';
import { type EntityId } from '@/game-v2/contracts/EntityId';
import { type StepContext } from '@/game-v2/contracts/StepContext';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { type World } from '@/game-v2/world/World';

const REQUIRED_PLAYER_MASK =
  ComponentMask.Transform | ComponentMask.Velocity | ComponentMask.Player;

const assertStepContext = (context: StepContext): void => {
  if (!Number.isSafeInteger(context.tick) || context.tick < 0) {
    throw new RangeError('tick must be a safe non-negative integer');
  }

  if (!Number.isFinite(context.deltaSeconds) || context.deltaSeconds <= 0) {
    throw new RangeError('delta seconds must be positive and finite');
  }

  if (
    !Number.isFinite(context.intent.moveX) ||
    !Number.isFinite(context.intent.moveY)
  ) {
    throw new RangeError('intent axes must be finite');
  }
};

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

    const currentX = world.x[slot] ?? 0;
    const currentY = world.y[slot] ?? 0;
    const velocityX = movementX * PLAYER_MOVE_SPEED;
    const velocityY = movementY * PLAYER_MOVE_SPEED;

    world.previousX[slot] = currentX;
    world.previousY[slot] = currentY;
    world.velocityX[slot] = velocityX;
    world.velocityY[slot] = velocityY;
    world.x[slot] = currentX + velocityX * context.deltaSeconds;
    world.y[slot] = currentY + velocityY * context.deltaSeconds;

    if (maxAxis > 0) {
      world.lastFacingX[slot] = facingX;
      world.lastFacingY[slot] = facingY;
    }
  }
}
