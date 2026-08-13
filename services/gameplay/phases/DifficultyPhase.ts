import type { PhaseInput } from '../contracts';
import {
  createBaselinePhaseResult,
  type BaselinePhaseResult,
  type IGameplayPhase,
} from './IGameplayPhase';
import { difficultyContext } from '../../difficulty/DifficultyContext';
import { MarketPosition } from '../../../types';
import {
  type DifficultyBoundaryInput,
  type DifficultyPhaseDecision,
  type DifficultyRuntime,
} from '../../difficulty/runtime/DifficultyRuntime';
import { type CanonicalMarketFrame } from '../../../types/marketCanonical';
import { DIFFICULTY_RUNTIME_CONFIG } from '../../../config/difficulty/DifficultyRuntimeConfig';
import {
  type DirectorEffectApplier,
  type DirectorEffectInput,
} from '../../director/effects/DirectorEffectApplier';
import { type GameplaySnapshot } from '../../director/contracts';

type DifficultyPhaseShared = Record<string, unknown> & {
  canonicalMarketFrame?: CanonicalMarketFrame | null;
  difficultyRunId?: string;
  difficultyRunSeed?: number;
  difficultyRunMode?: DifficultyBoundaryInput['run'] extends infer TRun
    ? TRun extends { mode: infer TMode }
      ? TMode
      : never
    : never;
  difficultyEntryPrice?: number;
  difficultyLiquidationPrice?: number;
  difficultyPosition?: MarketPosition;
  difficultyMaximumEnemies?: number;
  difficultyKillStreak?: number;
  difficultyActivePrimaryEncounters?: number;
  difficultyActiveSupportEncounters?: number;
  difficultyLiquidationProximity?: number;
  difficultyPhaseDecision?: DifficultyPhaseDecision;
  spawnPlan?: DifficultyPhaseDecision['activeSpawnPlan'];
  difficultySnapshotRevision?: number;
};

const createBoundaryInput = (): DifficultyBoundaryInput => ({
  tick: 0,
  deltaSeconds: 0,
  elapsedSeconds: 0,
  marketFrame: null,
  run: null,
  position: {
    side: MarketPosition.LONG,
    leverage: 1,
    entryPrice: 0,
    liquidationPrice: 0,
  },
  player: {
    hpRatio: 1,
    damageTakenPerSecond: 0,
    killsPerMinute: 0,
    combatMastery: 0,
    buildPower: 0,
    mobilityUsage: 0,
  },
  world: {
    width: 0,
    height: 0,
    activeEnemies: 0,
    maximumEnemies: 0,
    activePrimaryEncounters: 0,
    activeSupportEncounters: 0,
  },
});

/** Placeholder reference until the first Director commit lands. */
const EMPTY_GAMEPLAY_SNAPSHOT = {
  advantage: {
    activeMechanic: null,
    movementMultiplier: 1,
    dashCooldownMultiplier: 1,
    endsAtElapsedSeconds: 0,
    activationSequence: 0,
  },
} as unknown as GameplaySnapshot;

/**
 * DifficultyPhase — synchronizes the runtime clock into DifficultyContext and
 * hands the committed snapshot to the effect applier (contract §10).
 */
export class DifficultyPhase implements IGameplayPhase<'difficulty'> {
  public readonly phase = 'difficulty' as const;
  private readonly result = createBaselinePhaseResult(this.phase);
  private readonly boundaryInput = createBoundaryInput();
  private readonly effectInput: DirectorEffectInput = {
    snapshot: EMPTY_GAMEPLAY_SNAPSHOT,
    player: null,
    elapsedSeconds: 0,
    deltaSeconds: 0,
    world: { width: 0, height: 0 },
    seed: 0,
    liquidationProximity: 0,
  };
  private readonly boundaryRun: NonNullable<DifficultyBoundaryInput['run']> = {
    runId: '',
    seed: 0,
    mode: 'TOKEN',
    greedLevel: 0,
  };

  public constructor(
    private readonly runtime: DifficultyRuntime,
    private readonly effectApplier: DirectorEffectApplier | null = null
  ) {}

  public execute(input: PhaseInput<'difficulty'>): BaselinePhaseResult<'difficulty'> {
    const context = input.context;
    const shared = input.shared as DifficultyPhaseShared;
    const boundary = this.boundaryInput;
    const player = context.world.player.current;
    const runId = shared.difficultyRunId;
    const runSeed = shared.difficultyRunSeed;
    boundary.tick = context.clock.frame;
    boundary.deltaSeconds = context.clock.deltaMs / 1_000;
    boundary.elapsedSeconds = context.clock.elapsedMs / 1_000;
    boundary.marketFrame = shared.canonicalMarketFrame ?? null;
    if (runId !== undefined && runSeed !== undefined) {
      this.boundaryRun.runId = runId;
      this.boundaryRun.seed = runSeed;
      this.boundaryRun.mode = shared.difficultyRunMode ?? 'TOKEN';
      boundary.run = this.boundaryRun;
    } else {
      boundary.run = null;
    }
    boundary.position.side = shared.difficultyPosition ?? MarketPosition.LONG;
    boundary.position.leverage = context.marketData.leverage;
    boundary.position.entryPrice = shared.difficultyEntryPrice ?? 0;
    boundary.position.liquidationPrice = shared.difficultyLiquidationPrice ?? 0;
    boundary.player.hpRatio =
      player !== null && player.maxHp > 0 ? player.hp / player.maxHp : 0;
    boundary.player.damageTakenPerSecond = 0;
    boundary.player.killsPerMinute = shared.difficultyKillStreak ?? 0;
    boundary.player.combatMastery = Math.min(
      1,
      (shared.difficultyKillStreak ?? 0) /
        DIFFICULTY_RUNTIME_CONFIG.player.killsPerMinuteReference
    );
    boundary.player.buildPower = Math.min(
      1,
      (player?.level ?? 0) / DIFFICULTY_RUNTIME_CONFIG.player.levelPowerReference
    );
    boundary.player.mobilityUsage = context.world.gameState.current.isDashing ? 1 : 0;
    boundary.world.width = context.dimensions.width;
    boundary.world.height = context.dimensions.height;
    boundary.world.activeEnemies = context.world.pool.current.activeEnemies.length;
    boundary.world.maximumEnemies = shared.difficultyMaximumEnemies ?? 0;
    boundary.world.activePrimaryEncounters =
      shared.difficultyActivePrimaryEncounters ?? 0;
    boundary.world.activeSupportEncounters =
      shared.difficultyActiveSupportEncounters ?? 0;

    difficultyContext.updateTime(boundary.elapsedSeconds);
    const decision = this.runtime.commitAtBoundary(boundary);
    if (this.effectApplier !== null && decision.currentSnapshot !== null) {
      this.effectInput.snapshot = decision.currentSnapshot;
      this.effectInput.player = player;
      this.effectInput.elapsedSeconds = boundary.elapsedSeconds;
      this.effectInput.deltaSeconds = boundary.deltaSeconds;
      this.effectInput.world.width = boundary.world.width;
      this.effectInput.world.height = boundary.world.height;
      this.effectInput.seed = this.boundaryRun.seed;
      this.effectInput.liquidationProximity =
        shared.difficultyLiquidationProximity ?? 0;
      this.effectApplier.apply(this.effectInput);
    }
    const resultShared = this.result.shared as DifficultyPhaseShared;
    resultShared.difficultyPhaseDecision = decision;
    resultShared.spawnPlan = decision.activeSpawnPlan;
    resultShared.difficultySnapshotRevision = decision.activeRevision;

    return this.result;
  }
}
