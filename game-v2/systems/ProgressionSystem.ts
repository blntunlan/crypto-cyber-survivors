import {
  COMBAT_KILL_BUFFER_CAPACITY,
  LEVEL_2_XP_THRESHOLD,
  MAX_WORLD_CAPACITY,
  MVP0_MAX_PLAYER_LEVEL,
  PLAYER_STARTING_LEVEL,
  XP_PICKUP_RADIUS,
} from '@/game-v2/config/Mvp0Config';
import { type CombatStepResult } from '@/game-v2/contracts/CombatStepResult';
import { type EntityId } from '@/game-v2/contracts/EntityId';
import { type ProgressionStepResult } from '@/game-v2/contracts/ProgressionStepResult';
import { type RunCommand } from '@/game-v2/contracts/RunCommand';
import { type StepContext } from '@/game-v2/contracts/StepContext';
import { type CommandRecorder } from '@/game-v2/replay/CommandRecorder';
import { type DeterministicRng } from '@/game-v2/runtime/DeterministicRng';
import { type GameV2Lifecycle } from '@/game-v2/runtime/GameV2Lifecycle';
import { AbilityLoadoutSystem } from '@/game-v2/systems/AbilityLoadoutSystem';
import { LevelUpOfferSystem } from '@/game-v2/systems/LevelUpOfferSystem';
import { assertStepContext } from '@/game-v2/systems/StepContextValidator';
import { PassiveLoadoutSystem } from '@/game-v2/systems/PassiveLoadoutSystem';
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
  private readonly abilityLoadout: AbilityLoadoutSystem;
  private readonly passiveLoadout: PassiveLoadoutSystem;
  private readonly offerSystem: LevelUpOfferSystem;
  private readonly result: ProgressionStepResult;

  /**
   * Reused across `step` calls so collecting overlapping XP pickups costs
   * one `world.masks.length` scan (to validate and find the *existing*
   * ones) instead of two: this buffer records which slots to destroy —
   * existing pickups found overlapping during validation, plus any
   * just-spawned kill pickups found overlapping right after creation —
   * so the final destroy pass iterates exactly those slots instead of
   * re-scanning the whole world a second time. Sized to
   * `MAX_WORLD_CAPACITY`, the hard ceiling `World` itself enforces, so it
   * is always large enough regardless of which `World` instance is passed
   * to `step`.
   */
  private readonly overlappingPickupSlots = new Uint16Array(MAX_WORLD_CAPACITY);

  public constructor(
    lifecycle: GameV2Lifecycle,
    commandRecorder: CommandRecorder,
    abilityLoadout: AbilityLoadoutSystem = new AbilityLoadoutSystem(),
    passiveLoadout: PassiveLoadoutSystem = new PassiveLoadoutSystem(),
    offerSystem: LevelUpOfferSystem = new LevelUpOfferSystem(
      abilityLoadout,
      passiveLoadout
    )
  ) {
    this.lifecycle = lifecycle;
    this.commandRecorder = commandRecorder;
    this.abilityLoadout = abilityLoadout;
    this.passiveLoadout = passiveLoadout;
    this.offerSystem = offerSystem;
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
    world.rerollCharges[slot] = 1;
    world.banishCharges[slot] = 1;
    world.bannedCandidateKind[slot] = 0;
    world.bannedCandidateCode[slot] = 0;
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
    context: StepContext,
    rng: DeterministicRng
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

    // Validate every existing pickup before collection can destroy any of
    // them, and record which ones overlap so the destroy pass below does
    // not need a second `world.masks.length` scan to rediscover them.
    let overlapCount = 0;
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
        this.overlappingPickupSlots[overlapCount] = slot;
        overlapCount += 1;
      }
    }

    const nextPlayerXp = playerXp + xpCollectedThisTick;
    if (!isFiniteNonNegativeFloat32(nextPlayerXp)) {
      throw new RangeError('player XP exceeds finite Float32 storage');
    }

    if (world.freeSlotCount < killCount) {
      throw new RangeError('entity capacity exhausted for XP pickups');
    }

    // All existing pickups and the complete kill batch are validated by this
    // point (the kill batch above, existing pickups above), so creation and
    // the eventual destroy pass below cannot partially publish before a
    // malformed later row — nothing past this point can still throw for a
    // reason tied to input validity.
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

      // A pickup can spawn already overlapping the player (e.g. a ranged
      // kill at the player's own position); recomputing overlap here with
      // the position just written is cheap (killCount is bounded by
      // `COMBAT_KILL_BUFFER_CAPACITY`) and lets the destroy pass below stay
      // a single pass over the recorded slots instead of a second full scan.
      if (
        overlaps(playerX, playerY, playerRadius, spawnX, spawnY, XP_PICKUP_RADIUS_F32)
      ) {
        this.overlappingPickupSlots[overlapCount] = slot;
        overlapCount += 1;
      }
    }

    for (let i = 0; i < overlapCount; i += 1) {
      const slot = this.overlappingPickupSlots[i];
      if (slot === undefined) {
        throw new Error('overlapping pickup slot buffer is corrupt');
      }
      world.destroyEntity(world.entityIdOf(slot));
    }

    let leveledUp = false;
    if (playerLevel === PLAYER_STARTING_LEVEL && nextPlayerXp >= LEVEL_2_XP_THRESHOLD) {
      // Generate before mutating level/xp: if nothing is offerable and this
      // throws, the player must remain at its pre-level-up level/xp rather
      // than being left in a half-transitioned state with no open offer and
      // no way to retrigger the level-up branch.
      this.offerSystem.generateOffer(world, rng, playerEntity);
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

  /**
   * Resolves the open offer at `command.choiceIndex` and resumes the run.
   *
   * The index is validated against the *current offer* before the command is
   * recorded (V2-ADR-050): an index the offer cannot answer must never reach
   * the recorder, or a replay would carry a command the runtime it replays
   * against cannot apply. Recording still happens before the world mutates,
   * so a recorder failure cannot leave the world upgraded by an unrecorded
   * command.
   */
  public resolveUpgrade(
    world: World,
    playerEntity: EntityId,
    command: RunCommand & { type: 'choose-upgrade' }
  ): void {
    if (this.lifecycle.phase !== 'level-up') {
      throw new RangeError(
        'cannot resolve upgrade when lifecycle is not in level-up phase'
      );
    }

    const candidate = this.offerSystem.resolveIndex(
      world,
      playerEntity,
      command.choiceIndex
    );

    this.commandRecorder.record(command);

    if (candidate.kind === 'ability') {
      this.abilityLoadout.addOrAdvanceTier(world, playerEntity, candidate.identity);
    } else {
      this.passiveLoadout.addOrLevelUp(world, playerEntity, candidate.identity);
    }

    this.offerSystem.clearOwner(world, playerEntity);
    this.lifecycle.resumeFromLevelUp();
  }

  /**
   * Spends the reroll charge and regenerates the whole offer.
   *
   * The brief's interface omits an `rng` parameter, but `LevelUpOfferSystem`
   * has none of its own — `resolveUpgrade` needs none because resolving an
   * index consumes no randomness, while regenerating an offer does. This
   * mirrors `step`'s existing external-`rng` parameter (V2-105 deviation,
   * recorded rather than assumed silently).
   *
   * Validates lifecycle phase and charge availability, then records the
   * command, then mutates — mirroring `resolveUpgrade`'s validate-before-
   * record-before-mutate order so a rejected reroll leaves nothing recorded
   * or changed.
   */
  public rerollOffer(
    world: World,
    playerEntity: EntityId,
    command: RunCommand & { type: 'reroll-offer' },
    rng: DeterministicRng
  ): void {
    if (this.lifecycle.phase !== 'level-up') {
      throw new RangeError(
        'cannot reroll offer when lifecycle is not in level-up phase'
      );
    }

    if (this.offerSystem.rerollChargesOf(world, playerEntity) === 0) {
      throw new RangeError('no reroll charge remains');
    }

    this.commandRecorder.record(command);
    this.offerSystem.reroll(world, rng, playerEntity);
  }

  /**
   * Spends the banish charge, permanently bans the candidate at
   * `command.choiceIndex`, and replaces only that slot. See `rerollOffer`
   * for the `rng` parameter note and the validate-before-record-before-mutate
   * order this mirrors.
   */
  public banishOffer(
    world: World,
    playerEntity: EntityId,
    command: RunCommand & { type: 'banish-offer' },
    rng: DeterministicRng
  ): void {
    if (this.lifecycle.phase !== 'level-up') {
      throw new RangeError(
        'cannot banish offer when lifecycle is not in level-up phase'
      );
    }

    if (this.offerSystem.banishChargesOf(world, playerEntity) === 0) {
      throw new RangeError('no banish charge remains');
    }

    // Validates the index without mutating anything.
    this.offerSystem.resolveIndex(world, playerEntity, command.choiceIndex);

    this.commandRecorder.record(command);
    this.offerSystem.banish(world, rng, playerEntity, command.choiceIndex);
  }

  private hasOpenOffer(): boolean {
    return this.lifecycle.phase === 'level-up';
  }
}
