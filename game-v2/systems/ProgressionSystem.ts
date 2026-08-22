import {
  COMBAT_KILL_BUFFER_CAPACITY,
  LEVEL_2_XP_THRESHOLD,
  MVP0_MAX_PLAYER_LEVEL,
  PLAYER_STARTING_LEVEL,
  XP_PICKUP_RADIUS,
} from '@/game-v2/config/Mvp0Config';
import { type CombatStepResult } from '@/game-v2/contracts/CombatStepResult';
import { type EntityId } from '@/game-v2/contracts/EntityId';
import { type ProgressionStepResult } from '@/game-v2/contracts/ProgressionStepResult';
import { type RunCommand } from '@/game-v2/contracts/RunCommand';
import { type StepContext } from '@/game-v2/contracts/StepContext';
import { MOVE_SPEED_PASSIVE } from '@/game-v2/config/PassiveRegistry';
import { type CommandRecorder } from '@/game-v2/replay/CommandRecorder';
import { type GameV2Lifecycle } from '@/game-v2/runtime/GameV2Lifecycle';
import { assertStepContext } from '@/game-v2/systems/StepContextValidator';
import { PassiveLoadoutSystem } from '@/game-v2/systems/PassiveLoadoutSystem';
import { type WeaponSystem } from '@/game-v2/systems/WeaponSystem';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { type World } from '@/game-v2/world/World';

const PLAYER_ENTITY_MASK =
  ComponentMask.Transform | ComponentMask.Body | ComponentMask.Player;

const XP_PICKUP_ENTITY_MASK =
  ComponentMask.Transform | ComponentMask.Body | ComponentMask.XpPickup;

const XP_PICKUP_RADIUS_F32 = Math.fround(XP_PICKUP_RADIUS);

const isFiniteNonNegativeFloat32 = (value: number): boolean =>
  Number.isFinite(value) && value >= 0 && Number.isFinite(Math.fround(value));

const overlaps = (
  firstX: number,
  firstY: number,
  firstRadius: number,
  secondX: number,
  secondY: number,
  secondRadius: number
): boolean => {
  const combinedRadius = firstRadius + secondRadius;
  const diffX = secondX - firstX;
  const diffY = secondY - firstY;
  const maxAxis = Math.max(Math.abs(diffX), Math.abs(diffY));

  if (maxAxis > combinedRadius) {
    return false;
  }

  return diffX * diffX + diffY * diffY <= combinedRadius * combinedRadius;
};

export class ProgressionSystem {
  private readonly lifecycle: GameV2Lifecycle;
  private readonly commandRecorder: CommandRecorder;
  private readonly weaponSystem: WeaponSystem;
  private readonly passiveLoadout: PassiveLoadoutSystem;
  private readonly result: ProgressionStepResult;

  public constructor(
    lifecycle: GameV2Lifecycle,
    commandRecorder: CommandRecorder,
    weaponSystem: WeaponSystem,
    passiveLoadout: PassiveLoadoutSystem = new PassiveLoadoutSystem()
  ) {
    this.lifecycle = lifecycle;
    this.commandRecorder = commandRecorder;
    this.weaponSystem = weaponSystem;
    this.passiveLoadout = passiveLoadout;
    this.result = {
      pickupsSpawned: 0,
      xpCollected: 0,
      leveledUp: false,
      offerPending: false,
    };
  }

  public resetPlayer(world: World, playerEntity: EntityId): void {
    const slot = world.slotOf(playerEntity);
    const mask = world.masks[slot];

    if (mask === undefined || (mask & PLAYER_ENTITY_MASK) !== PLAYER_ENTITY_MASK) {
      throw new RangeError('player entity is missing required components');
    }

    world.xp[slot] = 0;
    world.level[slot] = PLAYER_STARTING_LEVEL;
  }

  /**
   * Advances progression for one tick.
   *
   * The system keeps no per-run state: whether an upgrade offer is open is read
   * from the lifecycle phase, which `RuntimeCheckpoint` already carries, so a
   * checkpoint restore cannot leave a stale offer behind and there is nothing
   * to reset between runs (V2-ADR-025). `pauseForLevelUp` has exactly one caller
   * in MVP-0, this system, which is what makes the phase a faithful reading of
   * "an offer is open".
   */
  public step(
    world: World,
    playerEntity: EntityId,
    combatResult: Readonly<CombatStepResult>,
    context: StepContext
  ): ProgressionStepResult {
    assertStepContext(context);

    if (this.lifecycle.phase !== 'playing') {
      throw new RangeError('progression requires lifecycle phase playing');
    }

    if (typeof combatResult.playerDied !== 'boolean') {
      throw new TypeError('combat playerDied must be a boolean');
    }

    // Terminal death owns this tick (V2-ADR-027). The runtime consumes the
    // cleared scratch output and performs `endRun`; progression must not turn a
    // simultaneous kill into a pickup or level-up first.
    if (combatResult.playerDied) {
      this.result.pickupsSpawned = 0;
      this.result.xpCollected = 0;
      this.result.leveledUp = false;
      this.result.offerPending = false;
      return this.result;
    }

    const { killCount, killX, killY, killXp } = combatResult;

    if (
      !Number.isSafeInteger(killCount) ||
      killCount < 0 ||
      killCount > COMBAT_KILL_BUFFER_CAPACITY
    ) {
      throw new RangeError('killCount is outside the supported bounded range');
    }

    if (
      !(killX instanceof Float32Array) ||
      !(killY instanceof Float32Array) ||
      !(killXp instanceof Float32Array)
    ) {
      throw new TypeError('combat kill storage must use Float32Array buffers');
    }

    if (
      killCount > killX.length ||
      killCount > killY.length ||
      killCount > killXp.length
    ) {
      throw new RangeError('killCount exceeds combat kill storage bounds');
    }

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
    const playerRadius = world.radius[playerSlot];
    const playerLevel = world.level[playerSlot];
    const playerXp = world.xp[playerSlot];

    if (
      playerX === undefined ||
      playerY === undefined ||
      playerRadius === undefined ||
      playerLevel === undefined ||
      playerXp === undefined ||
      !Number.isFinite(playerX) ||
      !Number.isFinite(playerY) ||
      !Number.isFinite(playerRadius) ||
      playerRadius < 0 ||
      !isFiniteNonNegativeFloat32(playerXp)
    ) {
      throw new RangeError('player progression state must be finite and non-negative');
    }

    if (playerLevel < PLAYER_STARTING_LEVEL || playerLevel > MVP0_MAX_PLAYER_LEVEL) {
      throw new RangeError('player was not initialized by resetPlayer');
    }

    let xpCollectedThisTick = 0;

    // Validate the complete kill batch before publishing its first pickup.
    for (let i = 0; i < killCount; i += 1) {
      const spawnX = killX[i];
      const spawnY = killY[i];
      const pickupXp = killXp[i];

      if (
        spawnX === undefined ||
        spawnY === undefined ||
        pickupXp === undefined ||
        !Number.isFinite(spawnX) ||
        !Number.isFinite(spawnY) ||
        !isFiniteNonNegativeFloat32(pickupXp)
      ) {
        throw new RangeError('kill data must be finite and non-negative');
      }

      if (
        overlaps(playerX, playerY, playerRadius, spawnX, spawnY, XP_PICKUP_RADIUS_F32)
      ) {
        xpCollectedThisTick += pickupXp;
        if (!isFiniteNonNegativeFloat32(xpCollectedThisTick)) {
          throw new RangeError('collected XP exceeds finite Float32 storage');
        }
      }
    }

    // Validate every existing pickup before collection can destroy any of them.
    for (let slot = 0; slot < world.masks.length; slot += 1) {
      const mask = world.masks[slot];
      if (
        mask === undefined ||
        (mask & XP_PICKUP_ENTITY_MASK) !== XP_PICKUP_ENTITY_MASK
      ) {
        continue;
      }

      const pickupX = world.x[slot];
      const pickupY = world.y[slot];
      const pickupRadius = world.radius[slot];
      const xpValue = world.xpPickupValue[slot];

      if (
        pickupX === undefined ||
        pickupY === undefined ||
        pickupRadius === undefined ||
        xpValue === undefined ||
        !Number.isFinite(pickupX) ||
        !Number.isFinite(pickupY) ||
        !Number.isFinite(pickupRadius) ||
        pickupRadius < 0 ||
        !isFiniteNonNegativeFloat32(xpValue)
      ) {
        throw new RangeError('XP pickup state must be finite and non-negative');
      }

      if (overlaps(playerX, playerY, playerRadius, pickupX, pickupY, pickupRadius)) {
        xpCollectedThisTick += xpValue;
        if (!isFiniteNonNegativeFloat32(xpCollectedThisTick)) {
          throw new RangeError('collected XP exceeds finite Float32 storage');
        }
      }
    }

    const nextPlayerXp = playerXp + xpCollectedThisTick;
    if (!isFiniteNonNegativeFloat32(nextPlayerXp)) {
      throw new RangeError('player XP exceeds finite Float32 storage');
    }

    if (world.freeSlotCount < killCount) {
      throw new RangeError('entity capacity exhausted for XP pickups');
    }

    for (let i = 0; i < killCount; i += 1) {
      const spawnX = killX[i];
      const spawnY = killY[i];
      const pickupXp = killXp[i];

      if (spawnX === undefined || spawnY === undefined || pickupXp === undefined) {
        throw new Error('validated combat kill storage became unavailable');
      }

      const pickup = world.createEntity(XP_PICKUP_ENTITY_MASK);
      const slot = world.slotOf(pickup);

      world.x[slot] = spawnX;
      world.y[slot] = spawnY;
      world.previousX[slot] = spawnX;
      world.previousY[slot] = spawnY;
      world.radius[slot] = XP_PICKUP_RADIUS_F32;
      world.xpPickupValue[slot] = pickupXp;
    }

    // All existing pickups and all just-spawned pickup data are validated now,
    // so collection cannot partially publish before a malformed later row.
    for (let slot = 0; slot < world.masks.length; slot += 1) {
      const mask = world.masks[slot];
      if (
        mask === undefined ||
        (mask & XP_PICKUP_ENTITY_MASK) !== XP_PICKUP_ENTITY_MASK
      ) {
        continue;
      }

      const pickupX = world.x[slot] ?? 0;
      const pickupY = world.y[slot] ?? 0;
      const pickupRadius = world.radius[slot] ?? 0;

      if (overlaps(playerX, playerY, playerRadius, pickupX, pickupY, pickupRadius)) {
        world.destroyEntity(world.entityIdOf(slot));
      }
    }

    let leveledUp = false;
    if (playerLevel === PLAYER_STARTING_LEVEL && nextPlayerXp >= LEVEL_2_XP_THRESHOLD) {
      world.level[playerSlot] = playerLevel + 1;
      world.xp[playerSlot] = nextPlayerXp - LEVEL_2_XP_THRESHOLD;
      this.lifecycle.pauseForLevelUp();
      leveledUp = true;
    } else if (xpCollectedThisTick > 0) {
      world.xp[playerSlot] = nextPlayerXp;
    }

    this.result.pickupsSpawned = killCount;
    this.result.xpCollected = xpCollectedThisTick;
    this.result.leveledUp = leveledUp;
    this.result.offerPending = this.hasOpenOffer();

    return this.result;
  }

  public resolveUpgrade(
    world: World,
    playerEntity: EntityId,
    command: RunCommand
  ): void {
    if (this.lifecycle.phase !== 'level-up') {
      throw new RangeError(
        'cannot resolve upgrade when lifecycle is not in level-up phase'
      );
    }

    // The command is recorded before it is applied, so a recorder failure can
    // never leave the world upgraded by a command no replay carries.
    this.commandRecorder.record(command);

    if (command.choiceId === 'starter-damage-2') {
      this.weaponSystem.advanceStarterTier(world, playerEntity);
    } else {
      this.passiveLoadout.addOrLevelUp(world, playerEntity, MOVE_SPEED_PASSIVE.id);
    }

    this.lifecycle.resumeFromLevelUp();
  }

  private hasOpenOffer(): boolean {
    return this.lifecycle.phase === 'level-up';
  }
}
