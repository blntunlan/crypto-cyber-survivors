import {
  CONVERGENCE_THRESHOLD,
  MVP0_CONFIG_VERSION,
  MVP0_ENEMY_SPAWN_BUDGET,
  MVP0_ENEMY_SPAWN_INTERVAL_TICKS,
  MVP0_ENEMY_SPAWN_RING_RADIUS,
  MVP0_MAX_LIVE_ENEMIES,
  MVP0_PLAYER_SPAWN_X,
  MVP0_PLAYER_SPAWN_Y,
  SIMULATION_HZ,
} from '@/game-v2/config/Mvp0Config';
import {
  ABILITY_SLOT_COUNT,
  type AbilitySlotIndex,
} from '@/game-v2/contracts/AbilitySlot';
import {
  type AbilitySlotReadout,
  type GameV2DebugSnapshot,
  type GameV2RuntimeReadout,
  type LevelUpOfferReadout,
} from '@/game-v2/contracts/GameV2Debug';
import { type GameV2Phase } from '@/game-v2/contracts/GameV2Phase';
import { NO_ENTITY, type EntityId } from '@/game-v2/contracts/EntityId';
import { type OfferCandidateIndex } from '@/game-v2/contracts/LevelUpOffer';
import { type PlayerIntent } from '@/game-v2/contracts/PlayerIntent';
import { type PositionContext } from '@/game-v2/contracts/PositionContext';
import { type RenderSnapshot } from '@/game-v2/contracts/RenderSnapshot';
import { type RunCommand } from '@/game-v2/contracts/RunCommand';
import { type RunIdentity } from '@/game-v2/contracts/RunIdentity';
import {
  RUN_RECORDING_SCHEMA_VERSION,
  type RecordedInputFrame,
  type RunRecording,
} from '@/game-v2/contracts/RunRecording';
import { type RuntimeCheckpoint } from '@/game-v2/contracts/RuntimeCheckpoint';
import { type StepContext } from '@/game-v2/contracts/StepContext';
import { MarketEncounterRuntime } from '@/game-v2/market/MarketEncounterRuntime';
import { type RenderSnapshotWriter } from '@/game-v2/presentation/RenderSnapshotWriter';
import { type CommandRecorder } from '@/game-v2/replay/CommandRecorder';
import {
  type InputRecorder,
  type MutableInputFrame,
} from '@/game-v2/replay/InputRecorder';
import { hashRuntimeCheckpoint } from '@/game-v2/replay/StateHasher';
import { writeCheckpoint } from '@/game-v2/replay/WorldSnapshotWriter';
import {
  type DeterministicRng,
  type RngSnapshot,
} from '@/game-v2/runtime/DeterministicRng';
import { type GameV2Lifecycle } from '@/game-v2/runtime/GameV2Lifecycle';
import { type SimulationClock } from '@/game-v2/runtime/SimulationClock';
import { type CombatSystem } from '@/game-v2/systems/CombatSystem';
import { type ConvergenceSystem } from '@/game-v2/systems/ConvergenceSystem';
import { type DashSystem } from '@/game-v2/systems/DashSystem';
import { type EnemyComposer } from '@/game-v2/systems/EnemyComposer';
import { type EnemySystem } from '@/game-v2/systems/EnemySystem';
import { type EnemyDefinition } from '@/game-v2/contracts/EnemyArchetype';
import { type MovementSystem } from '@/game-v2/systems/MovementSystem';
import { type AbilityLoadoutSystem } from '@/game-v2/systems/AbilityLoadoutSystem';
import { type LevelUpOfferSystem } from '@/game-v2/systems/LevelUpOfferSystem';
import { type ProgressionSystem } from '@/game-v2/systems/ProgressionSystem';
import { type WeaponSystem } from '@/game-v2/systems/WeaponSystem';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { type World } from '@/game-v2/world/World';

const SIMULATION_STEP_SECONDS = 1 / SIMULATION_HZ;

/**
 * The union of every mask the MVP-0 systems demand of the player. `Faction` is
 * deliberately absent: nothing reads it for the player, and a component with no
 * reader is state that can drift without failing (V2-ADR-026).
 */
const PLAYER_ENTITY_MASK =
  ComponentMask.Transform |
  ComponentMask.Velocity |
  ComponentMask.Body |
  ComponentMask.Health |
  ComponentMask.Player |
  ComponentMask.AbilityLoadout |
  ComponentMask.PassiveLoadout |
  ComponentMask.LevelUpOffer;

const ENEMY_MASK = ComponentMask.Transform | ComponentMask.Enemy;
const PROJECTILE_MASK = ComponentMask.Transform | ComponentMask.Projectile;
const XP_PICKUP_MASK = ComponentMask.Transform | ComponentMask.XpPickup;

const EMPTY_ABILITY_SLOTS: readonly (AbilitySlotReadout | null)[] = Object.freeze(
  new Array(ABILITY_SLOT_COUNT).fill(null)
);

const EMPTY_READOUT: GameV2RuntimeReadout = Object.freeze({
  tick: 0,
  phase: 'idle',
  playerX: 0,
  playerY: 0,
  playerHealth: 0,
  playerMaxHealth: 0,
  playerLevel: 0,
  weaponDamage: 0,
  moveSpeed: 0,
  moveSpeedLevel: 0,
  moveSpeedUpgradable: false,
  invulnerabilityTicks: 0,
  dashCooldownTicks: 0,
  enemyCount: 0,
  projectileCount: 0,
  xpPickupCount: 0,
  nearestEnemyX: null,
  nearestEnemyY: null,
  nearestXpPickupX: null,
  nearestXpPickupY: null,
  abilitySlots: EMPTY_ABILITY_SLOTS,
  levelUpOffer: null,
  rerollCharges: 0,
  banishCharges: 0,
  convergenceProgress: 0,
  convergenceReached: false,
});

/**
 * Supplies one tick of input.
 *
 * Returning `false` means no further simulation tick may run — a finished
 * recording, for example. The runtime then leaves the tick counter alone, which
 * is what makes a replay end on exactly the recorded tick regardless of how many
 * render frames the host produced.
 */
export type IntentSource = {
  sample(tick: number, out: PlayerIntent): boolean;
  /**
   * Drops anything the source buffered for a run that has ended.
   *
   * The runtime cannot see inside its input adapter, and a source is not
   * sampled at all once the run is over, so an edge captured on the
   * game-over screen would otherwise fire on the first tick of the next
   * run (V2-ADR-034).
   */
  reset?(): void;
};

export type RuntimePresentation = {
  present(snapshot: RenderSnapshot, alpha: number): void;
  resize(viewportWidth: number, viewportHeight: number): void;
  dispose(): void;
};

export type GameV2RuntimeDependencies = {
  world: World;
  rng: DeterministicRng;
  clock: SimulationClock;
  lifecycle: GameV2Lifecycle;
  runIdentity: RunIdentity;
  /**
   * Locked before the runtime is constructed (`V2-ADR-088`); exposed via the
   * `positionContext` getter with no mutator anywhere on this class.
   */
  positionContext: PositionContext;
  intentSource: IntentSource;
  inputRecorder: InputRecorder;
  commandRecorder: CommandRecorder;
  renderSnapshot: RenderSnapshot;
  renderSnapshotWriter: RenderSnapshotWriter;
  dashSystem: DashSystem;
  movementSystem: MovementSystem;
  enemySystem: EnemySystem;
  enemyComposer: EnemyComposer;
  weaponSystem: WeaponSystem;
  combatSystem: CombatSystem;
  progressionSystem: ProgressionSystem;
  convergenceSystem: ConvergenceSystem;
  /** Read-only from the runtime's perspective: fills `readout().abilitySlots`. */
  abilityLoadoutSystem: AbilityLoadoutSystem;
  /** Read-only from the runtime's perspective: fills `readout().levelUpOffer`. */
  offerSystem: LevelUpOfferSystem;
  presentation: RuntimePresentation | null;
  /**
   * Omit for a fully inert (no market feed) runtime — every pre-`V2-213`
   * caller is unaffected (`V2-ADR-152`).
   */
  marketEncounterRuntime?: MarketEncounterRuntime;
  /**
   * Staleness must measure real wall-clock time (`V2-ADR-142`), which
   * tick-derived time cannot correctly represent across a paused run.
   * Omit for the real `Date.now` in production; inject a scripted clock
   * for deterministic tests (`V2-ADR-156`).
   */
  nowMsProvider?: () => number;
};

/**
 * Owns one MVP-0 run: the fixed-step tick order, the lifecycle transitions it
 * triggers, and the render handoff.
 *
 * The simulation is authoritative and Three.js is not: presentation only ever
 * reads a `RenderSnapshot` written after the ticks for the frame have run.
 */
export class GameV2Runtime {
  private readonly world: World;
  private readonly rng: DeterministicRng;
  private readonly clock: SimulationClock;
  private readonly lifecycle: GameV2Lifecycle;
  private readonly identity: RunIdentity;
  private readonly position: PositionContext;
  private readonly intentSource: IntentSource;
  private readonly inputRecorder: InputRecorder;
  private readonly commandRecorder: CommandRecorder;
  private readonly renderSnapshot: RenderSnapshot;
  private readonly renderSnapshotWriter: RenderSnapshotWriter;
  private readonly dashSystem: DashSystem;
  private readonly movementSystem: MovementSystem;
  private readonly enemySystem: EnemySystem;
  private readonly enemyComposer: EnemyComposer;
  private readonly weaponSystem: WeaponSystem;
  private readonly combatSystem: CombatSystem;
  private readonly progressionSystem: ProgressionSystem;
  private readonly convergenceSystem: ConvergenceSystem;
  private readonly abilityLoadoutSystem: AbilityLoadoutSystem;
  private readonly offerSystem: LevelUpOfferSystem;
  private readonly presentation: RuntimePresentation | null;
  private readonly marketEncounterRuntime: MarketEncounterRuntime;
  private readonly nowMsProvider: () => number;

  private readonly initialRngSnapshot: RngSnapshot;
  private readonly intent: PlayerIntent = { moveX: 0, moveY: 0, dashPressed: false };
  private readonly stepContext: StepContext;
  private readonly inputScratch: MutableInputFrame = {
    tick: 0,
    moveX: 0,
    moveY: 0,
    dashPressed: false,
  };

  /** Reused so a cadence tick allocates nothing inside the step loop. */
  private readonly spawnRequest = {
    type: 'ring' as const,
    centerX: 0,
    centerY: 0,
    radius: MVP0_ENEMY_SPAWN_RING_RADIUS,
  };

  /**
   * Reused so a cadence tick's composition draw allocates no new array
   * (`V2-108`); `EnemyComposer.compose` always resets `.length` to `0`
   * first, so a stale entry can never leak into a shorter composition.
   */
  private readonly spawnBatch: EnemyDefinition[] = [];

  /**
   * Separate from `spawnBatch` (`V2-213`) — the two spawn sources run
   * sequentially within the same tick, but a dedicated buffer keeps each
   * one's contents unambiguous rather than relying on call order.
   * `MarketEncounterRuntime.step` always resets `.length` to `0` first.
   */
  private readonly marketSpawnBatch: EnemyDefinition[] = [];

  private playerEntity: EntityId = NO_ENTITY;
  private simulationTick = 0;
  private initialHash = '';
  private disposed = false;

  public constructor(dependencies: GameV2RuntimeDependencies) {
    this.world = dependencies.world;
    this.rng = dependencies.rng;
    this.clock = dependencies.clock;
    this.lifecycle = dependencies.lifecycle;
    this.identity = dependencies.runIdentity;
    this.position = dependencies.positionContext;
    this.intentSource = dependencies.intentSource;
    this.inputRecorder = dependencies.inputRecorder;
    this.commandRecorder = dependencies.commandRecorder;
    this.renderSnapshot = dependencies.renderSnapshot;
    this.renderSnapshotWriter = dependencies.renderSnapshotWriter;
    this.dashSystem = dependencies.dashSystem;
    this.movementSystem = dependencies.movementSystem;
    this.enemySystem = dependencies.enemySystem;
    this.enemyComposer = dependencies.enemyComposer;
    this.weaponSystem = dependencies.weaponSystem;
    this.combatSystem = dependencies.combatSystem;
    this.progressionSystem = dependencies.progressionSystem;
    this.convergenceSystem = dependencies.convergenceSystem;
    this.abilityLoadoutSystem = dependencies.abilityLoadoutSystem;
    this.offerSystem = dependencies.offerSystem;
    this.presentation = dependencies.presentation;
    this.marketEncounterRuntime =
      dependencies.marketEncounterRuntime ?? new MarketEncounterRuntime();
    this.nowMsProvider = dependencies.nowMsProvider ?? Date.now;
    this.initialRngSnapshot = this.rng.snapshot();
    this.stepContext = {
      tick: 0,
      deltaSeconds: SIMULATION_STEP_SECONDS,
      intent: this.intent,
    };
  }

  public get phase(): GameV2Phase {
    return this.lifecycle.phase;
  }

  public get tick(): number {
    return this.simulationTick;
  }

  public get runIdentity(): RunIdentity {
    return this.identity;
  }

  /** Locked before construction (`V2-ADR-088`); no mutator exists. */
  public get positionContext(): PositionContext {
    return this.position;
  }

  /** Creates the player and opens the run. Only legal from `idle`. */
  public start(): void {
    this.assertUsable();
    this.lifecycle.start();
    this.playerEntity = this.createPlayer();
    this.initialHash = this.snapshotHash();
    this.renderSnapshotWriter.write(this.world, this.renderSnapshot);
  }

  /**
   * Consumes one render frame: runs whatever fixed steps it earned, then writes
   * and presents exactly one render snapshot.
   */
  public advanceFrame(renderDeltaMs: number): void {
    this.assertUsable();

    if (this.lifecycle.phase === 'idle') {
      throw new RangeError('runtime must be started before it can advance');
    }

    const advance = this.clock.advance(renderDeltaMs, this.runSimulationTick);
    this.renderSnapshotWriter.write(this.world, this.renderSnapshot);
    this.presentation?.present(this.renderSnapshot, advance.interpolationAlpha);
  }

  /** Resolves the open level-up offer at `choiceIndex` and resumes the simulation. */
  public chooseUpgrade(choiceIndex: OfferCandidateIndex): void {
    this.assertUsable();

    if (this.lifecycle.phase !== 'level-up') {
      throw new RangeError('no upgrade offer is open');
    }

    this.progressionSystem.resolveUpgrade(this.world, this.playerEntity, {
      tick: this.simulationTick,
      type: 'choose-upgrade',
      choiceIndex,
    });
    this.clock.resume();
  }

  /**
   * Spends the reroll charge and regenerates the whole open offer (V2-105).
   * Does not resume the simulation: the level-up remains paused so the
   * player can still choose from the new offer.
   */
  public rerollOffer(): void {
    this.assertUsable();

    if (this.lifecycle.phase !== 'level-up') {
      throw new RangeError('no upgrade offer is open');
    }

    this.progressionSystem.rerollOffer(
      this.world,
      this.playerEntity,
      { tick: this.simulationTick, type: 'reroll-offer' },
      this.rng
    );
  }

  /**
   * Spends the banish charge, bans the candidate at `choiceIndex` for the
   * rest of the run, and replaces only that slot (V2-105). Does not resume
   * the simulation.
   */
  public banishOffer(choiceIndex: OfferCandidateIndex): void {
    this.assertUsable();

    if (this.lifecycle.phase !== 'level-up') {
      throw new RangeError('no upgrade offer is open');
    }

    this.progressionSystem.banishOffer(
      this.world,
      this.playerEntity,
      { tick: this.simulationTick, type: 'banish-offer', choiceIndex },
      this.rng
    );
  }

  public resize(viewportWidth: number, viewportHeight: number): void {
    this.assertUsable();
    this.presentation?.resize(viewportWidth, viewportHeight);
  }

  public checkpoint(): RuntimeCheckpoint {
    this.assertUsable();

    return writeCheckpoint({
      world: this.world,
      tick: this.simulationTick,
      runIdentity: this.identity,
      rngSnapshot: this.rng.snapshot(),
      lifecycle: {
        phase: this.lifecycle.phase,
        sessionEpoch: this.lifecycle.sessionEpoch,
      },
      configVersion: MVP0_CONFIG_VERSION,
    });
  }

  public snapshotHash(): string {
    return hashRuntimeCheckpoint(this.checkpoint());
  }

  public exportRecording(): RunRecording {
    this.assertUsable();

    const frames: RecordedInputFrame[] = [];
    for (let index = 0; index < this.inputRecorder.count; index += 1) {
      this.inputRecorder.read(index, this.inputScratch);
      frames.push(
        Object.freeze({
          tick: this.inputScratch.tick,
          moveX: this.inputScratch.moveX,
          moveY: this.inputScratch.moveY,
          dashPressed: this.inputScratch.dashPressed,
        })
      );
    }

    const commands: RunCommand[] = [];
    for (let index = 0; index < this.commandRecorder.count; index += 1) {
      commands.push(this.commandRecorder.read(index));
    }

    return Object.freeze({
      schemaVersion: RUN_RECORDING_SCHEMA_VERSION,
      configVersion: MVP0_CONFIG_VERSION,
      runIdentity: this.identity,
      positionContext: this.position,
      initialHash: this.initialHash,
      frames: Object.freeze(frames),
      commands: Object.freeze(commands),
    });
  }

  /**
   * Returns the runtime to `idle` with nothing of the finished run left.
   *
   * The lifecycle's session epoch advances and `World.reset()` retires the
   * generation of every slot that was alive, so a stale entity handle from the
   * previous run can never resolve. Both are intentional: a reset run is a new
   * session, not a bit-identical rerun of the old one (V2-ADR-029).
   */
  public reset(): void {
    this.assertUsable();
    this.world.reset();
    this.clock.reset();
    this.rng.restore(this.initialRngSnapshot);
    this.intentSource.reset?.();
    this.inputRecorder.reset();
    this.commandRecorder.reset();
    this.marketEncounterRuntime.reset();
    this.playerEntity = NO_ENTITY;
    this.simulationTick = 0;
    this.initialHash = '';
    this.intent.moveX = 0;
    this.intent.moveY = 0;
    this.intent.dashPressed = false;
    this.stepContext.tick = 0;
    this.lifecycle.reset();
    this.renderSnapshotWriter.write(this.world, this.renderSnapshot);
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.playerEntity = NO_ENTITY;
    this.lifecycle.dispose();
    this.presentation?.dispose();
  }

  /** Cheap, hash-free view of the authoritative state. */
  public readout(): GameV2RuntimeReadout {
    if (this.disposed || this.playerEntity === NO_ENTITY) {
      return {
        ...EMPTY_READOUT,
        phase: this.lifecycle.phase,
        tick: this.simulationTick,
      };
    }

    const playerSlot = this.world.slotOf(this.playerEntity);
    const playerX = this.world.x[playerSlot] ?? 0;
    const playerY = this.world.y[playerSlot] ?? 0;

    let enemyCount = 0;
    let projectileCount = 0;
    let xpPickupCount = 0;
    let nearestEnemySlot = -1;
    let nearestEnemyDistanceSq = Number.POSITIVE_INFINITY;
    let nearestPickupSlot = -1;
    let nearestPickupDistanceSq = Number.POSITIVE_INFINITY;

    for (let slot = 0; slot < this.world.masks.length; slot += 1) {
      const mask = this.world.masks[slot] ?? 0;

      if ((mask & ENEMY_MASK) === ENEMY_MASK) {
        enemyCount += 1;
        const distanceSq = this.distanceSquaredToPlayer(slot, playerX, playerY);
        if (distanceSq < nearestEnemyDistanceSq) {
          nearestEnemyDistanceSq = distanceSq;
          nearestEnemySlot = slot;
        }
      }

      if ((mask & PROJECTILE_MASK) === PROJECTILE_MASK) {
        projectileCount += 1;
      }

      if ((mask & XP_PICKUP_MASK) === XP_PICKUP_MASK) {
        xpPickupCount += 1;
        const distanceSq = this.distanceSquaredToPlayer(slot, playerX, playerY);
        if (distanceSq < nearestPickupDistanceSq) {
          nearestPickupDistanceSq = distanceSq;
          nearestPickupSlot = slot;
        }
      }
    }

    return {
      tick: this.simulationTick,
      phase: this.lifecycle.phase,
      playerX,
      playerY,
      playerHealth: this.world.health[playerSlot] ?? 0,
      playerMaxHealth: this.world.maxHealth[playerSlot] ?? 0,
      playerLevel: this.world.level[playerSlot] ?? 0,
      weaponDamage: this.weaponSystem.starterDamageOf(this.world, this.playerEntity),
      moveSpeed: this.movementSystem.moveSpeedOf(this.world, this.playerEntity),
      moveSpeedLevel: this.movementSystem.moveSpeedLevelOf(
        this.world,
        this.playerEntity
      ),
      moveSpeedUpgradable: this.movementSystem.moveSpeedUpgradable(
        this.world,
        this.playerEntity
      ),
      invulnerabilityTicks: this.world.invulnerabilityTicksRemaining[playerSlot] ?? 0,
      dashCooldownTicks: this.world.dashCooldownTicksRemaining[playerSlot] ?? 0,
      enemyCount,
      projectileCount,
      xpPickupCount,
      nearestEnemyX:
        nearestEnemySlot < 0 ? null : (this.world.x[nearestEnemySlot] ?? 0),
      nearestEnemyY:
        nearestEnemySlot < 0 ? null : (this.world.y[nearestEnemySlot] ?? 0),
      nearestXpPickupX:
        nearestPickupSlot < 0 ? null : (this.world.x[nearestPickupSlot] ?? 0),
      nearestXpPickupY:
        nearestPickupSlot < 0 ? null : (this.world.y[nearestPickupSlot] ?? 0),
      abilitySlots: this.readAbilitySlots(),
      levelUpOffer: this.readLevelUpOffer(),
      rerollCharges: this.offerSystem.rerollChargesOf(this.world, this.playerEntity),
      banishCharges: this.offerSystem.banishChargesOf(this.world, this.playerEntity),
      convergenceProgress: Math.min(
        1,
        (this.world.convergence[playerSlot] ?? 0) / CONVERGENCE_THRESHOLD
      ),
      convergenceReached: this.world.convergenceReached[playerSlot] === 1,
    };
  }

  /** `null` unless the lifecycle currently holds an open offer. */
  private readLevelUpOffer(): LevelUpOfferReadout | null {
    if (this.lifecycle.phase !== 'level-up') {
      return null;
    }

    const defaultIndex = this.offerSystem.defaultIndexOf(this.world, this.playerEntity);

    if (defaultIndex === null) {
      return null;
    }

    return {
      candidates: this.offerSystem.candidatesAt(this.world, this.playerEntity),
      defaultIndex,
    };
  }

  /** Builds the HUD's view of the four ability slots (V2-ADR-047). */
  private readAbilitySlots(): readonly (AbilitySlotReadout | null)[] {
    const slots: (AbilitySlotReadout | null)[] = new Array(ABILITY_SLOT_COUNT);

    for (let index = 0; index < ABILITY_SLOT_COUNT; index += 1) {
      const slotIndex = index as AbilitySlotIndex;
      const activation = this.abilityLoadoutSystem.activationAt(
        this.world,
        this.playerEntity,
        slotIndex
      );
      const tier = this.abilityLoadoutSystem.tierAt(
        this.world,
        this.playerEntity,
        slotIndex
      );

      slots[index] =
        activation === null || tier === null
          ? null
          : { index: slotIndex, activation, tier };
    }

    return slots;
  }

  public debugSnapshot(): GameV2DebugSnapshot {
    return { ...this.readout(), stateHash: this.snapshotHash() };
  }

  private distanceSquaredToPlayer(
    slot: number,
    playerX: number,
    playerY: number
  ): number {
    const deltaX = (this.world.x[slot] ?? 0) - playerX;
    const deltaY = (this.world.y[slot] ?? 0) - playerY;

    return deltaX * deltaX + deltaY * deltaY;
  }

  /**
   * The only legal MVP-0 tick order.
   *
   * A step that is not allowed to run — the simulation is paused for a level-up,
   * the run is over, or the input source is exhausted — leaves the tick counter
   * untouched. The clock may still have drained accumulated milliseconds for it,
   * which changes when later ticks happen in wall-clock time but never changes
   * the tick sequence itself.
   */
  private readonly runSimulationTick = (): void => {
    if (this.lifecycle.phase !== 'playing') {
      return;
    }

    const nextTick = this.simulationTick + 1;

    if (!this.intentSource.sample(nextTick, this.intent)) {
      return;
    }

    // The recording stores movement as Float32, so the simulation must consume
    // the Float32 value too. Stepping on the sampled Float64 instead would make
    // a replay of the run diverge from the run by roughly one ULP per tick,
    // which compounds into a different state hash.
    this.intent.moveX = Math.fround(this.intent.moveX);
    this.intent.moveY = Math.fround(this.intent.moveY);

    this.inputRecorder.record(nextTick, this.intent);
    this.simulationTick = nextTick;
    this.stepContext.tick = nextTick;

    const player = this.playerEntity;

    this.spawnDueEnemy(nextTick);
    this.stepMarketEncounters(nextTick);
    this.dashSystem.step(this.world, player, this.stepContext);
    this.movementSystem.step(this.world, player, this.stepContext);
    this.enemySystem.step(this.world, player, SIMULATION_STEP_SECONDS);
    this.weaponSystem.step(this.world, player, this.stepContext);

    const combat = this.combatSystem.step(this.world, player, this.stepContext);
    const progression = this.progressionSystem.step(
      this.world,
      player,
      combat,
      this.stepContext,
      this.rng
    );
    this.convergenceSystem.step(this.world, player, combat, this.stepContext);

    // Terminal death dominates the tick; progression already cleared its output
    // for this case (V2-ADR-027), so there is no offer left to honour.
    if (combat.playerDied) {
      this.lifecycle.endRun();
      this.clock.pause();
      return;
    }

    // Mirrors the same death-dominance rule (V2-ADR-155): a market bonus
    // recorded by stepMarketEncounters this tick is only applied once the
    // tick is known not to be lethal.
    this.marketEncounterRuntime.applyPendingConvergenceBonus(
      this.world,
      player,
      this.stepContext
    );

    if (progression.offerPending) {
      this.clock.pause();
    }
  };

  /**
   * Spends `MVP0_ENEMY_SPAWN_BUDGET` composing a batch of enemies each
   * cadence tick (`V2-108`), each spawned on a ring centred on the player.
   *
   * Two bounds gate every spawn in the batch: `freeSlotCount` is
   * `spawnEnemy`'s documented precondition, and the live-enemy cap keeps the
   * spawner inside the render snapshot's enemy capacity (the same constant,
   * pinned together in the config test). A composition drawing more than one
   * archetype is what makes these bounds binding rather than merely defined.
   */
  private spawnDueEnemy(tick: number): void {
    if (tick % MVP0_ENEMY_SPAWN_INTERVAL_TICKS !== 1) {
      return;
    }

    let liveEnemies = this.countLiveEnemies();

    if (liveEnemies >= MVP0_MAX_LIVE_ENEMIES || this.world.freeSlotCount === 0) {
      return;
    }

    const playerSlot = this.world.slotOf(this.playerEntity);

    this.spawnRequest.centerX = this.world.x[playerSlot] ?? 0;
    this.spawnRequest.centerY = this.world.y[playerSlot] ?? 0;

    this.enemyComposer.compose(MVP0_ENEMY_SPAWN_BUDGET, this.rng, this.spawnBatch);

    for (const definition of this.spawnBatch) {
      if (liveEnemies >= MVP0_MAX_LIVE_ENEMIES || this.world.freeSlotCount === 0) {
        return;
      }

      this.enemySystem.spawnEnemy(this.world, this.rng, this.spawnRequest, definition);
      liveEnemies += 1;
    }
  }

  /**
   * `V2-213`: composes this tick's market encounter (a no-op with the
   * default inert `MarketEncounterRuntime`) and spends any `SPAWN`
   * composition through the exact same live-enemy-cap/free-slot guards
   * `spawnDueEnemy` uses, sharing `countLiveEnemies` so the two spawn
   * sources agree on the same live count within one tick.
   */
  private stepMarketEncounters(tick: number): void {
    this.marketEncounterRuntime.step(
      this.rng,
      tick,
      this.nowMsProvider(),
      this.marketSpawnBatch
    );

    if (this.marketSpawnBatch.length === 0) {
      return;
    }

    let liveEnemies = this.countLiveEnemies();

    if (liveEnemies >= MVP0_MAX_LIVE_ENEMIES || this.world.freeSlotCount === 0) {
      return;
    }

    const playerSlot = this.world.slotOf(this.playerEntity);

    this.spawnRequest.centerX = this.world.x[playerSlot] ?? 0;
    this.spawnRequest.centerY = this.world.y[playerSlot] ?? 0;

    for (const definition of this.marketSpawnBatch) {
      if (liveEnemies >= MVP0_MAX_LIVE_ENEMIES || this.world.freeSlotCount === 0) {
        return;
      }

      this.enemySystem.spawnEnemy(this.world, this.rng, this.spawnRequest, definition);
      liveEnemies += 1;
    }
  }

  private countLiveEnemies(): number {
    let liveEnemies = 0;

    for (let slot = 0; slot < this.world.masks.length; slot += 1) {
      if (((this.world.masks[slot] ?? 0) & ENEMY_MASK) === ENEMY_MASK) {
        liveEnemies += 1;
      }
    }

    return liveEnemies;
  }

  private createPlayer(): EntityId {
    const player = this.world.createEntity(PLAYER_ENTITY_MASK);
    const slot = this.world.slotOf(player);

    this.world.x[slot] = MVP0_PLAYER_SPAWN_X;
    this.world.y[slot] = MVP0_PLAYER_SPAWN_Y;
    this.world.previousX[slot] = MVP0_PLAYER_SPAWN_X;
    this.world.previousY[slot] = MVP0_PLAYER_SPAWN_Y;

    this.dashSystem.resetPlayer(this.world, player);
    this.weaponSystem.resetPlayer(this.world, player);
    this.combatSystem.resetPlayer(this.world, player);
    this.progressionSystem.resetPlayer(this.world, player);
    this.convergenceSystem.resetPlayer(this.world, player);

    return player;
  }

  private assertUsable(): void {
    if (this.disposed) {
      throw new RangeError('runtime is disposed');
    }
  }
}
