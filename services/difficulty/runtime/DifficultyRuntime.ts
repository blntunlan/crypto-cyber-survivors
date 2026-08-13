import { getDirectorRuntimeConfig } from '../../../config/directorRuntime';
import { MarketPosition } from '../../../types';
import { EventBus } from '../../core/EventBus';
import {
  type DifficultyRuntimeMode,
  type DirectorRuntimePlan,
  resolveDirectorRuntimePlan,
} from '../../director/DirectorRuntimeMode';
import {
  type GameplayRunMode,
  type GameplaySnapshot,
  type SpawnPlan,
} from '../../director/contracts';
import { type DirectorContractViolation } from '../../director/DirectorContractGuard';
import {
  SpawnPlanBuilder,
  type SpawnPlanWorldInput,
} from '../../director/SpawnPlanBuilder';
import { type CanonicalMarketFrame } from '../../../types/marketCanonical';
import {
  type DifficultyReasonCode,
  type RuntimeDifficultySnapshot,
} from '../../../types/runtimeDifficulty';
import { type PlayerHitEvent } from '../../../types/events';
import { CurrentDifficultyRuntimeAdapter } from './CurrentDifficultyRuntimeAdapter';
import { DifficultyEventBridge } from './DifficultyEventBridge';
import { DifficultyInputInbox } from './DifficultyInputInbox';
import { DifficultyRuntimeOrchestrator } from './DifficultyRuntimeOrchestrator';
import {
  type DifficultyRuntimeInputView,
  type DifficultyRunConstants,
  type DifficultyWorldPressure,
} from './contracts';
import { DifficultyV2CompatibilityAdapter } from './DifficultyV2CompatibilityAdapter';
import {
  ShadowComparisonRecorder,
  type CurrentDirectorSnapshot,
  type ShadowComparisonRecord,
} from './ShadowComparisonRecorder';

export type DifficultyBoundaryInput = {
  tick: number;
  deltaSeconds: number;
  elapsedSeconds: number;
  marketFrame: CanonicalMarketFrame | null;
  run: {
    runId: string;
    seed: number;
    mode: GameplayRunMode;
    greedLevel: number;
  } | null;
  position: {
    side: MarketPosition;
    leverage: number;
    entryPrice: number;
    liquidationPrice: number;
  };
  player: {
    hpRatio: number;
    damageTakenPerSecond: number;
    killsPerMinute: number;
    combatMastery: number;
    buildPower: number;
    mobilityUsage: number;
  };
  world: {
    width: number;
    height: number;
    activeEnemies: number;
    maximumEnemies: number;
    activePrimaryEncounters: number;
    activeSupportEncounters: number;
  };
};

export type DifficultyPhaseDecision = {
  authority: 'current' | 'modular';
  activeSpawnPlan: SpawnPlan;
  activeRevision: number;
  snapshot: RuntimeDifficultySnapshot | null;
  shadowSnapshot: RuntimeDifficultySnapshot | null;
  currentSnapshot: GameplaySnapshot | null;
  /** Contract rules broken on this commit; empty on a healthy tick. */
  violations: readonly DirectorContractViolation[];
};

const NO_VIOLATIONS: readonly DirectorContractViolation[] = [];

export type DifficultyRuntimeOptions = {
  onSnapshotCommitted?: (snapshot: RuntimeDifficultySnapshot) => void;
};

const createEmptyPlan = (): SpawnPlan => ({
  revision: 0,
  seed: 0,
  spendableThreat: 0,
  composition: [],
  statTier: 0,
  maxActiveEnemies: 0,
  spawnWindowSeconds: 0,
  intents: [],
});

const NO_PENDING_LIFECYCLE_TICK = Number.MAX_SAFE_INTEGER;
const NO_FALLBACK_CODES: readonly DifficultyReasonCode[] = [];
const STALE_FALLBACK_CODES: readonly DifficultyReasonCode[] = ['MARKET_STALE'];

export class DifficultyRuntime {
  private readonly plan: DirectorRuntimePlan;
  private readonly inbox = new DifficultyInputInbox();
  private readonly currentAdapter = new CurrentDifficultyRuntimeAdapter();
  private readonly compatibilityAdapter = new DifficultyV2CompatibilityAdapter();
  private readonly shadowRecorder = new ShadowComparisonRecorder();
  private readonly modularOrchestrator: DifficultyRuntimeOrchestrator;
  private readonly bridge: DifficultyEventBridge;
  private readonly modularPlan = createEmptyPlan();
  private readonly modularPlanBuilder = new SpawnPlanBuilder();
  private readonly modularPlanWorld: SpawnPlanWorldInput = {
    width: 0,
    height: 0,
    activeEnemies: 0,
    maxActiveEnemies: 0,
    position: MarketPosition.LONG,
  };
  private readonly boundaryRunConstants: DifficultyRunConstants = {
    runId: '',
    seed: 0,
    side: 'LONG',
    leverage: 0,
    entryPrice: 0,
    liquidationPrice: 0,
  };
  private readonly boundaryWorldPressure: DifficultyWorldPressure = {
    activeEnemies: 0,
    maximumEnemies: 0,
    activeEncounters: 0,
  };
  private inputView: DifficultyRuntimeInputView;
  private previousCommittedSnapshot: RuntimeDifficultySnapshot | null = null;
  private disposed = false;
  private resetEligibleTick = NO_PENDING_LIFECYCLE_TICK;
  private cycleContinueEligibleTick = NO_PENDING_LIFECYCLE_TICK;
  private readonly decision: DifficultyPhaseDecision = {
    authority: 'current',
    activeSpawnPlan: this.modularPlan,
    activeRevision: 0,
    snapshot: null,
    shadowSnapshot: null,
    currentSnapshot: null,
    violations: NO_VIOLATIONS,
  };
  private currentTick = 0;

  public constructor(
    mode: DifficultyRuntimeMode,
    options: DifficultyRuntimeOptions = {}
  ) {
    this.plan = resolveDirectorRuntimePlan(mode);
    this.modularOrchestrator = new DifficultyRuntimeOrchestrator({
      onCommit: snapshot => {
        this.compatibilityAdapter.emitTransitions(
          this.previousCommittedSnapshot,
          snapshot
        );
        this.previousCommittedSnapshot = snapshot;
        EventBus.emit('difficultySnapshotCommitted', { snapshot });
        options.onSnapshotCommitted?.(snapshot);
      },
    });
    this.bridge = new DifficultyEventBridge(this.inbox, () => this.currentTick, {
      requestReset: eligibleFromTick => {
        this.resetEligibleTick = Math.min(this.resetEligibleTick, eligibleFromTick);
      },
      requestCycleContinue: eligibleFromTick => {
        this.cycleContinueEligibleTick = Math.min(
          this.cycleContinueEligibleTick,
          eligibleFromTick
        );
      },
    });
    this.inputView = this.inbox.drain(0);
    this.bridge.start();
  }

  public commitAtBoundary(input: DifficultyBoundaryInput): DifficultyPhaseDecision {
    this.currentTick = input.tick;
    this.applyPendingLifecycle(input.tick);
    if (input.marketFrame !== null) {
      this.inbox.recordMarketFrame(input.marketFrame, input.tick);
    }
    if (input.run !== null) {
      const runConstants = this.boundaryRunConstants;
      runConstants.runId = input.run.runId;
      runConstants.seed = input.run.seed;
      runConstants.side =
        input.position.side === MarketPosition.LONG ? 'LONG' : 'SHORT';
      runConstants.leverage = input.position.leverage;
      runConstants.entryPrice = input.position.entryPrice;
      runConstants.liquidationPrice = input.position.liquidationPrice;
      this.inbox.initializeRun(runConstants, input.tick);
    }
    const worldPressure = this.boundaryWorldPressure;
    worldPressure.activeEnemies = input.world.activeEnemies;
    worldPressure.maximumEnemies = input.world.maximumEnemies;
    worldPressure.activeEncounters =
      input.world.activePrimaryEncounters + input.world.activeSupportEncounters;
    this.inbox.recordWorldPressure(worldPressure, input.tick);
    const inputView = this.inbox.drain(input.tick);
    this.inputView = inputView;
    if (input.run !== null) {
      input.run.greedLevel = inputView.run.greedLevel;
    }
    const currentDecision = this.plan.runsCurrentAdapter
      ? this.currentAdapter.commitAtBoundary(input)
      : null;
    const modularResult = this.plan.runsModularShadow
      ? this.modularOrchestrator.commitIfNeeded(
          inputView,
          input.tick,
          input.elapsedSeconds
        )
      : null;

    if (
      this.plan.mode === 'shadow' &&
      currentDecision?.snapshot &&
      modularResult !== null
    ) {
      this.shadowRecorder.record(
        `runtime-${currentDecision.plan.revision}-${modularResult.snapshot.meta.revision}`,
        this.createCurrentComparison(input, currentDecision),
        modularResult.snapshot
      );
    }

    if (this.plan.appliesModularSnapshot && modularResult !== null) {
      const modularPlan = this.buildModularPlan(modularResult.snapshot, input);
      this.decision.authority = 'modular';
      this.decision.activeSpawnPlan = modularPlan;
      this.decision.activeRevision = modularResult.snapshot.meta.revision;
      this.decision.snapshot = modularResult.snapshot;
      this.decision.shadowSnapshot = null;
      this.decision.currentSnapshot = null;
      this.decision.violations = currentDecision?.violations ?? NO_VIOLATIONS;
      return this.decision;
    }

    this.decision.authority = 'current';
    this.decision.activeSpawnPlan = currentDecision?.plan ?? this.modularPlan;
    this.decision.activeRevision = currentDecision?.plan.revision ?? 0;
    this.decision.snapshot = null;
    this.decision.shadowSnapshot = modularResult?.snapshot ?? null;
    this.decision.currentSnapshot = currentDecision?.snapshot ?? null;
    this.decision.violations = currentDecision?.violations ?? NO_VIOLATIONS;
    return this.decision;
  }

  /** Wires the Director's safe-route query into the spawn planner (§10). */
  public setBlockedPositionQuery(query: (x: number, y: number) => boolean): void {
    this.currentAdapter.setBlockedPositionQuery(query);
  }

  public getInputSnapshot(): DifficultyRuntimeInputView {
    this.inputView = this.inbox.drain(this.currentTick);
    return this.inputView;
  }

  public getShadowComparisons(): readonly ShadowComparisonRecord[] {
    return this.shadowRecorder.getRecords();
  }

  public initializeRun(constants: DifficultyRunConstants): void {
    this.inbox.initializeRun(constants, this.currentTick);
  }

  public recordMarketFrame(
    frame: Readonly<CanonicalMarketFrame>,
    eligibleFromTick: number
  ): void {
    this.currentTick = Math.max(this.currentTick, eligibleFromTick);
    this.inbox.recordMarketFrame(frame, eligibleFromTick);
  }

  public recordPlayerHit(event: PlayerHitEvent, eligibleFromTick: number): void {
    this.currentTick = Math.max(this.currentTick, eligibleFromTick);
    this.inbox.recordPlayerHit(event, eligibleFromTick);
  }

  public resetForCycleContinue(): void {
    this.inbox.resetForCycleContinue();
    this.inputView = this.inbox.drain(this.currentTick);
    this.currentAdapter.reset();
    this.modularOrchestrator.reset();
    this.shadowRecorder.reset();
    this.previousCommittedSnapshot = null;
    this.cycleContinueEligibleTick = NO_PENDING_LIFECYCLE_TICK;
    this.clearDecision();
  }

  public reset(): void {
    this.inbox.reset();
    this.inputView = this.inbox.drain(0);
    this.currentAdapter.reset();
    this.modularOrchestrator.reset();
    this.shadowRecorder.reset();
    this.modularPlan.revision = 0;
    this.modularPlan.seed = 0;
    this.modularPlan.spendableThreat = 0;
    this.modularPlan.maxActiveEnemies = 0;
    this.modularPlan.spawnWindowSeconds = 0;
    this.clearDecision();
    this.previousCommittedSnapshot = null;
    this.resetEligibleTick = NO_PENDING_LIFECYCLE_TICK;
    this.cycleContinueEligibleTick = NO_PENDING_LIFECYCLE_TICK;
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.bridge.dispose();
    this.reset();
  }

  private buildModularPlan(
    snapshot: RuntimeDifficultySnapshot,
    input: DifficultyBoundaryInput
  ): SpawnPlan {
    this.modularPlanWorld.width = input.world.width;
    this.modularPlanWorld.height = input.world.height;
    this.modularPlanWorld.activeEnemies = input.world.activeEnemies;
    this.modularPlanWorld.maxActiveEnemies = input.world.maximumEnemies;
    this.modularPlanWorld.position = input.position.side;
    return this.modularPlanBuilder.build({
      tick: input.tick,
      snapshot,
      world: this.modularPlanWorld,
    });
  }

  private createCurrentComparison(
    input: DifficultyBoundaryInput,
    current: ReturnType<CurrentDifficultyRuntimeAdapter['commitAtBoundary']>
  ): CurrentDirectorSnapshot {
    const snapshot = current.snapshot;
    const firstIntent = current.plan.intents[0];
    const fallbackCodes =
      input.marketFrame?.quality === 'STALE' ? STALE_FALLBACK_CODES : NO_FALLBACK_CODES;
    return {
      revision: current.plan.revision,
      threatTarget: snapshot?.threat.target ?? 0,
      creditRate: snapshot?.threat.creditRate ?? 0,
      spawnWindowSeconds: current.plan.spawnWindowSeconds,
      spawnCount: current.plan.intents.length,
      composition: current.plan.composition,
      enemyHealthMultiplier: firstIntent?.healthMultiplier ?? 1,
      enemyDamageMultiplier: firstIntent?.damageMultiplier ?? 1,
      enemySpeedMultiplier: firstIntent?.speedMultiplier ?? 1,
      mercy: 0,
      recoveryNeed: 0,
      encounterPhase: snapshot?.encounter.phase ?? 'IDLE',
      presentationIntensity: snapshot?.environment.presentationIntensity ?? 0,
      quality: input.marketFrame?.quality === 'LIVE' ? 'LIVE' : 'DEGRADED',
      fallbackCodes,
    };
  }

  private clearDecision(): void {
    this.decision.authority = this.plan.appliesModularSnapshot ? 'modular' : 'current';
    this.decision.activeSpawnPlan = this.modularPlan;
    this.decision.activeRevision = 0;
    this.decision.snapshot = null;
    this.decision.shadowSnapshot = null;
    this.decision.currentSnapshot = null;
    this.decision.violations = NO_VIOLATIONS;
  }

  private applyPendingLifecycle(tick: number): void {
    if (this.resetEligibleTick <= tick) {
      this.reset();
      this.currentTick = tick;
      this.inputView = this.inbox.drain(tick);
      return;
    }
    if (this.cycleContinueEligibleTick <= tick) {
      this.resetForCycleContinue();
      this.currentTick = tick;
      this.inputView = this.inbox.drain(tick);
    }
  }
}

export const createDifficultyRuntime = (
  mode: DifficultyRuntimeMode = getDirectorRuntimeConfig().mode,
  options: DifficultyRuntimeOptions = {}
): DifficultyRuntime => new DifficultyRuntime(mode, options);
