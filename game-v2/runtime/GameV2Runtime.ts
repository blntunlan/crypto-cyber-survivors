import {
  MVP0_CONFIG_VERSION,
  MVP0_ENEMY_SPAWN_INTERVAL_TICKS,
  MVP0_ENEMY_SPAWN_RING_RADIUS,
  MVP0_MAX_LIVE_ENEMIES,
  MVP0_PLAYER_SPAWN_X,
  MVP0_PLAYER_SPAWN_Y,
  SIMULATION_HZ,
} from '@/game-v2/config/Mvp0Config';
import {
  type GameV2DebugSnapshot,
  type GameV2RuntimeReadout,
} from '@/game-v2/contracts/GameV2Debug';
import { type GameV2Phase } from '@/game-v2/contracts/GameV2Phase';
import { NO_ENTITY, type EntityId } from '@/game-v2/contracts/EntityId';
import { type PlayerIntent } from '@/game-v2/contracts/PlayerIntent';
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
import { type DashSystem } from '@/game-v2/systems/DashSystem';
import { type EnemySystem } from '@/game-v2/systems/EnemySystem';
import { type MovementSystem } from '@/game-v2/systems/MovementSystem';
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
  ComponentMask.Player;

const ENEMY_MASK = ComponentMask.Transform | ComponentMask.Enemy;
const PROJECTILE_MASK = ComponentMask.Transform | ComponentMask.Projectile;
const XP_PICKUP_MASK = ComponentMask.Transform | ComponentMask.XpPickup;

const EMPTY_READOUT: GameV2RuntimeReadout = Object.freeze({
  tick: 0,
  phase: 'idle',
  playerX: 0,
  playerY: 0,
  playerHealth: 0,
  playerMaxHealth: 0,
  playerLevel: 0,
  weaponDamage: 0,
  invulnerabilityTicks: 0,
  dashCooldownTicks: 0,
  enemyCount: 0,
  projectileCount: 0,
  xpPickupCount: 0,
  nearestEnemyX: null,
  nearestEnemyY: null,
  nearestXpPickupX: null,
  nearestXpPickupY: null,
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
  intentSource: IntentSource;
  inputRecorder: InputRecorder;
  commandRecorder: CommandRecorder;
  renderSnapshot: RenderSnapshot;
  renderSnapshotWriter: RenderSnapshotWriter;
  dashSystem: DashSystem;
  movementSystem: MovementSystem;
  enemySystem: EnemySystem;
  weaponSystem: WeaponSystem;
  combatSystem: CombatSystem;
  progressionSystem: ProgressionSystem;
  presentation: RuntimePresentation | null;
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
  private readonly intentSource: IntentSource;
  private readonly inputRecorder: InputRecorder;
  private readonly commandRecorder: CommandRecorder;
  private readonly renderSnapshot: RenderSnapshot;
  private readonly renderSnapshotWriter: RenderSnapshotWriter;
  private readonly dashSystem: DashSystem;
  private readonly movementSystem: MovementSystem;
  private readonly enemySystem: EnemySystem;
  private readonly weaponSystem: WeaponSystem;
  private readonly combatSystem: CombatSystem;
  private readonly progressionSystem: ProgressionSystem;
  private readonly presentation: RuntimePresentation | null;

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
    this.intentSource = dependencies.intentSource;
    this.inputRecorder = dependencies.inputRecorder;
    this.commandRecorder = dependencies.commandRecorder;
    this.renderSnapshot = dependencies.renderSnapshot;
    this.renderSnapshotWriter = dependencies.renderSnapshotWriter;
    this.dashSystem = dependencies.dashSystem;
    this.movementSystem = dependencies.movementSystem;
    this.enemySystem = dependencies.enemySystem;
    this.weaponSystem = dependencies.weaponSystem;
    this.combatSystem = dependencies.combatSystem;
    this.progressionSystem = dependencies.progressionSystem;
    this.presentation = dependencies.presentation;
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

  /** Resolves the open level-up offer and resumes the simulation. */
  public chooseUpgrade(choiceId: RunCommand['choiceId']): void {
    this.assertUsable();

    if (this.lifecycle.phase !== 'level-up') {
      throw new RangeError('no upgrade offer is open');
    }

    this.progressionSystem.resolveUpgrade(this.world, this.playerEntity, {
      tick: this.simulationTick,
      type: 'choose-upgrade',
      choiceId,
    });
    this.clock.resume();
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
      weaponDamage: this.world.weaponDamage[playerSlot] ?? 0,
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
    };
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
    this.dashSystem.step(this.world, player, this.stepContext);
    this.movementSystem.step(this.world, player, this.stepContext);
    this.enemySystem.step(this.world, player, SIMULATION_STEP_SECONDS);
    this.weaponSystem.step(this.world, player, this.stepContext);

    const combat = this.combatSystem.step(this.world, player, this.stepContext);
    const progression = this.progressionSystem.step(
      this.world,
      player,
      combat,
      this.stepContext
    );

    // Terminal death dominates the tick; progression already cleared its output
    // for this case (V2-ADR-027), so there is no offer left to honour.
    if (combat.playerDied) {
      this.lifecycle.endRun();
      this.clock.pause();
      return;
    }

    if (progression.offerPending) {
      this.clock.pause();
    }
  };

  /**
   * Spawns at most one enemy per cadence tick, on a ring centred on the player.
   *
   * Two bounds gate the spawn. `freeSlotCount` is `spawnEnemy`'s documented
   * precondition. The live-enemy cap is the invariant that keeps the spawner
   * inside the render snapshot's enemy capacity: both are the same constant,
   * pinned together in the config test. MVP-0 balance kills the player long
   * before either binds, so neither is reachable from a gameplay test yet;
   * V2-108's composition budget is what will make them binding.
   */
  private spawnDueEnemy(tick: number): void {
    if (tick % MVP0_ENEMY_SPAWN_INTERVAL_TICKS !== 1) {
      return;
    }

    if (this.world.freeSlotCount === 0) {
      return;
    }

    let liveEnemies = 0;
    for (let slot = 0; slot < this.world.masks.length; slot += 1) {
      if (((this.world.masks[slot] ?? 0) & ENEMY_MASK) === ENEMY_MASK) {
        liveEnemies += 1;
      }
    }

    if (liveEnemies >= MVP0_MAX_LIVE_ENEMIES) {
      return;
    }

    const playerSlot = this.world.slotOf(this.playerEntity);

    this.spawnRequest.centerX = this.world.x[playerSlot] ?? 0;
    this.spawnRequest.centerY = this.world.y[playerSlot] ?? 0;

    this.enemySystem.spawnEnemy(this.world, this.rng, this.spawnRequest);
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

    return player;
  }

  private assertUsable(): void {
    if (this.disposed) {
      throw new RangeError('runtime is disposed');
    }
  }
}
