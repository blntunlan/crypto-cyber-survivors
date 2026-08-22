import { MOVE_SPEED_PASSIVE } from '@/game-v2/config/PassiveRegistry';
import { type EntityId } from '@/game-v2/contracts/EntityId';
import {
  PASSIVE_MOVE_SPEED_BY_LEVEL,
  type PassiveLevel,
} from '@/game-v2/contracts/PassiveSlot';
import { type StepContext } from '@/game-v2/contracts/StepContext';
import { PassiveLoadoutSystem } from '@/game-v2/systems/PassiveLoadoutSystem';
import { assertStepContext } from '@/game-v2/systems/StepContextValidator';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { type World } from '@/game-v2/world/World';

const REQUIRED_PLAYER_MASK =
  ComponentMask.Transform |
  ComponentMask.Velocity |
  ComponentMask.Player |
  ComponentMask.PassiveLoadout;

const assertPlayerMask = (mask: number | undefined): void => {
  if (mask === undefined || (mask & REQUIRED_PLAYER_MASK) !== REQUIRED_PLAYER_MASK) {
    throw new RangeError('player entity is missing required components');
  }
};

export class MovementSystem {
  private readonly passiveLoadout: PassiveLoadoutSystem;

  public constructor(
    passiveLoadout: PassiveLoadoutSystem = new PassiveLoadoutSystem()
  ) {
    this.passiveLoadout = passiveLoadout;
  }

  /** Whether another `move-speed` level could be taken right now. */
  public moveSpeedUpgradable(world: World, playerEntity: EntityId): boolean {
    return this.passiveLoadout.isOfferable(world, playerEntity, MOVE_SPEED_PASSIVE.id);
  }

  /** The `move-speed` passive level, or `0` when the player does not hold it. */
  public moveSpeedLevelOf(world: World, playerEntity: EntityId): number {
    return this.passiveLoadout.levelOf(world, playerEntity, MOVE_SPEED_PASSIVE.id) ?? 0;
  }

  /**
   * The walking speed the player currently has.
   *
   * Speed is derived from the `move-speed` passive level rather than stored, so
   * the loadout is the only authority for it (V2-ADR-041). Level `null` reads as
   * the unmodified base speed.
   */
  public moveSpeedOf(world: World, playerEntity: EntityId): number {
    const level: PassiveLevel | null = this.passiveLoadout.levelOf(
      world,
      playerEntity,
      MOVE_SPEED_PASSIVE.id
    );
    const speed = PASSIVE_MOVE_SPEED_BY_LEVEL[level ?? 0];

    if (speed === undefined) {
      throw new RangeError('passive move-speed level has no authored speed');
    }

    return speed;
  }

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

    const moveSpeed = this.moveSpeedOf(world, playerEntity);
    const velocityX = movementX * moveSpeed;
    const velocityY = movementY * moveSpeed;
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
