import {
  DASH_COOLDOWN_TICKS,
  DASH_DURATION_SECONDS,
  DASH_INVULNERABILITY_TICKS,
  DASH_SPEED,
} from '@/game-v2/config/Mvp0Config';
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

const assertFiniteDashState = (world: World, slot: number): void => {
  const velocityX = world.velocityX[slot];
  const velocityY = world.velocityY[slot];
  const lastFacingX = world.lastFacingX[slot];
  const lastFacingY = world.lastFacingY[slot];
  const dashDirectionX = world.dashDirectionX[slot];
  const dashDirectionY = world.dashDirectionY[slot];
  const dashRemainingSeconds = world.dashRemainingSeconds[slot];

  if (
    velocityX === undefined ||
    velocityY === undefined ||
    lastFacingX === undefined ||
    lastFacingY === undefined ||
    dashDirectionX === undefined ||
    dashDirectionY === undefined ||
    dashRemainingSeconds === undefined ||
    !Number.isFinite(velocityX) ||
    !Number.isFinite(velocityY) ||
    !Number.isFinite(lastFacingX) ||
    !Number.isFinite(lastFacingY) ||
    !Number.isFinite(dashDirectionX) ||
    !Number.isFinite(dashDirectionY) ||
    !Number.isFinite(dashRemainingSeconds)
  ) {
    throw new RangeError(
      'dash velocity, direction, remaining time, and facing must be finite'
    );
  }

  if (dashRemainingSeconds < 0) {
    throw new RangeError('dash remaining time cannot be negative');
  }
};

const normalizedAxis = (
  axis: number,
  maxAxis: number,
  inverseScaledMagnitude: number
): number => (axis / maxAxis) * inverseScaledMagnitude;

export class DashSystem {
  public resetPlayer(world: World, playerEntity: EntityId): void {
    const slot = world.slotOf(playerEntity);
    const mask = world.masks[slot];
    assertPlayerMask(mask);

    world.velocityX[slot] = 0;
    world.velocityY[slot] = 0;
    world.lastFacingX[slot] = 0;
    world.lastFacingY[slot] = 0;
    world.dashDirectionX[slot] = 0;
    world.dashDirectionY[slot] = 0;
    world.dashRemainingSeconds[slot] = 0;
    world.invulnerabilityTicksRemaining[slot] = 0;
    world.dashCooldownTicksRemaining[slot] = 0;
    world.dashCharges[slot] = 1;
    world.movementOverride[slot] = 0;
  }

  public step(world: World, playerEntity: EntityId, context: StepContext): void {
    assertStepContext(context);
    const slot = world.slotOf(playerEntity);
    const mask = world.masks[slot];
    assertPlayerMask(mask);
    assertFiniteDashState(world, slot);

    const currentCooldown = world.dashCooldownTicksRemaining[slot] ?? 0;
    const currentInvulnerability = world.invulnerabilityTicksRemaining[slot] ?? 0;
    const currentCharge = world.dashCharges[slot] ?? 0;
    const dashRemainingSeconds = world.dashRemainingSeconds[slot] ?? 0;
    const movementOverride = world.movementOverride[slot] ?? 0;

    let nextCooldown = currentCooldown;
    let nextInvulnerability = currentInvulnerability;
    let nextCharge = currentCharge;

    if (nextCooldown > 0) {
      nextCooldown -= 1;
      if (nextCooldown === 0) {
        nextCharge = 1;
      }
    }

    if (nextInvulnerability > 0) {
      nextInvulnerability -= 1;
    }

    let directionX = context.intent.moveX;
    let directionY = context.intent.moveY;
    let maxAxis = Math.max(Math.abs(directionX), Math.abs(directionY));

    if (maxAxis === 0) {
      directionX = world.lastFacingX[slot] ?? 0;
      directionY = world.lastFacingY[slot] ?? 0;
      maxAxis = Math.max(Math.abs(directionX), Math.abs(directionY));
    }

    if (maxAxis > 0) {
      const scaledX = directionX / maxAxis;
      const scaledY = directionY / maxAxis;
      const inverseScaledMagnitude = 1 / Math.hypot(scaledX, scaledY);
      directionX = normalizedAxis(directionX, maxAxis, inverseScaledMagnitude);
      directionY = normalizedAxis(directionY, maxAxis, inverseScaledMagnitude);
    }

    const canStart =
      context.intent.dashPressed && (directionX !== 0 || directionY !== 0);
    const shouldStart =
      canStart &&
      nextCharge === 1 &&
      nextCooldown === 0 &&
      dashRemainingSeconds === 0 &&
      movementOverride === 0;

    if (shouldStart) {
      world.dashDirectionX[slot] = directionX;
      world.dashDirectionY[slot] = directionY;
      world.lastFacingX[slot] = directionX;
      world.lastFacingY[slot] = directionY;
      world.dashRemainingSeconds[slot] = DASH_DURATION_SECONDS;
      world.invulnerabilityTicksRemaining[slot] = DASH_INVULNERABILITY_TICKS;
      world.dashCooldownTicksRemaining[slot] = DASH_COOLDOWN_TICKS;
      world.dashCharges[slot] = 0;
      world.movementOverride[slot] = 1;
      world.velocityX[slot] = directionX * DASH_SPEED;
      world.velocityY[slot] = directionY * DASH_SPEED;
      return;
    }

    world.invulnerabilityTicksRemaining[slot] = nextInvulnerability;
    world.dashCooldownTicksRemaining[slot] = nextCooldown;
    world.dashCharges[slot] = nextCharge > 1 ? 1 : nextCharge;
  }
}
