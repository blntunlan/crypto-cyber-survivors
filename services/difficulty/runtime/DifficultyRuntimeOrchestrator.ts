import { DIFFICULTY_RUNTIME_CONFIG } from '../../../config/difficulty/DifficultyRuntimeConfig';
import { DIRECTOR_CONFIG_V1 } from '../../director/config/DirectorConfigV1';
import {
  createNeutralRuntimeDifficultySnapshot,
  type DifficultyReasonCode,
  type MarketDecisionSummary,
  type RuntimeDifficultySnapshot,
} from '../../../types/runtimeDifficulty';
import {
  DifficultySnapshotComposer,
  type DifficultySnapshotComposerOptions,
} from './DifficultySnapshotComposer';
import {
  type DifficultyRevisionVector,
  type DifficultyRuntimeInputView,
  type MarketRegimeDecision,
} from './contracts';
import { EncounterManager } from './managers/EncounterManager';
import { MarketRegimeManager } from './managers/MarketRegimeManager';
import { PacingManager } from './managers/PacingManager';
import { PlayerAdaptationManager } from './managers/PlayerAdaptationManager';
import { PositionRiskManager } from './managers/PositionRiskManager';
import { RecoveryBudgetManager } from './managers/RecoveryBudgetManager';
import { ThreatBudgetManager } from './managers/ThreatBudgetManager';

export type RuntimeCommitReason =
  | 'UNCHANGED'
  | 'CADENCE'
  | 'DIRTY'
  | 'LIFECYCLE'
  | 'FALLBACK';

export type RuntimeCommitResult = {
  committed: boolean;
  snapshot: RuntimeDifficultySnapshot;
  reason: RuntimeCommitReason;
};

export type DifficultyRuntimeOrchestratorOptions = DifficultySnapshotComposerOptions & {
  marketManager?: MarketRegimeManager;
  graceTicks?: number;
};

const createNeutralMarketDecision = (
  tick: number,
  inputRevision: number
): MarketRegimeDecision => {
  const reasonCodes: DifficultyReasonCode[] = ['MARKET_NEUTRAL_FALLBACK'];
  const value: MarketDecisionSummary = {
    sourceSequence: 0,
    quality: 'DEGRADED',
    regime: 'CALM',
    confidence: 0,
    pressure: 0,
    volatility: 0,
    volume: 0,
    trend: 0,
    rsiExtremity: 0,
    whalePressure: 0,
    activeEventFamily: null,
    reasonCodes,
  };
  return {
    revision: 0,
    validFromTick: tick,
    inputRevision,
    quality: 'DEGRADED',
    value,
    reasonCodes,
    clampCodes: [],
  };
};

const maxInputRevision = (revisions: Readonly<DifficultyRevisionVector>): number =>
  Math.max(revisions.market, revisions.player, revisions.run, revisions.world);

export class DifficultyRuntimeOrchestrator {
  private readonly marketManager: MarketRegimeManager;
  private readonly playerManager = new PlayerAdaptationManager();
  private readonly positionManager = new PositionRiskManager();
  private readonly pacingManager = new PacingManager();
  private readonly recoveryManager = new RecoveryBudgetManager();
  private readonly threatManager = new ThreatBudgetManager();
  private readonly encounterManager = new EncounterManager();
  private readonly composer: DifficultySnapshotComposer;
  private readonly graceTicks: number;
  private readonly committedRevisions: DifficultyRevisionVector = {
    market: 0,
    player: 0,
    run: 0,
    world: 0,
  };
  private readonly fallbackCodes: DifficultyReasonCode[] = [];
  private snapshot = createNeutralRuntimeDifficultySnapshot({
    tick: 0,
    inputRevision: 0,
  });
  private hasCommitted = false;
  private lastCadenceBucket = -1;
  private lastEvaluationElapsedSeconds = 0;
  private marketFailureTicks = 0;

  public constructor(options: DifficultyRuntimeOrchestratorOptions = {}) {
    this.marketManager = options.marketManager ?? new MarketRegimeManager();
    this.graceTicks = Math.max(
      0,
      Math.trunc(
        options.graceTicks ?? DIFFICULTY_RUNTIME_CONFIG.managerFailureGraceTicks
      )
    );
    this.composer = new DifficultySnapshotComposer({
      traceRing: options.traceRing,
      onCommit: options.onCommit,
    });
  }

  public commitIfNeeded(
    input: DifficultyRuntimeInputView,
    tick: number,
    elapsedSeconds: number
  ): RuntimeCommitResult {
    const frequency = DIRECTOR_CONFIG_V1.runtime.updateFrequencyHz;
    const cadenceBucket = Math.floor(Math.max(0, elapsedSeconds) * frequency);
    const revisionsChanged = this.haveRevisionsChanged(input.revisions);
    if (
      this.hasCommitted &&
      !revisionsChanged &&
      cadenceBucket <= this.lastCadenceBucket
    ) {
      return { committed: false, snapshot: this.snapshot, reason: 'UNCHANGED' };
    }

    const reason: RuntimeCommitReason = !this.hasCommitted
      ? 'LIFECYCLE'
      : input.revisions.run !== this.committedRevisions.run
        ? 'LIFECYCLE'
        : revisionsChanged
          ? 'DIRTY'
          : 'CADENCE';
    const evaluationElapsedSeconds = cadenceBucket / frequency;
    const deltaSeconds = this.hasCommitted
      ? Math.max(0, evaluationElapsedSeconds - this.lastEvaluationElapsedSeconds)
      : 0;
    const inputRevision = maxInputRevision(input.revisions);
    const marketFrame = input.market.frame;
    this.fallbackCodes.length = 0;

    let market;
    try {
      market = this.marketManager.update({
        frame: marketFrame,
        elapsedSeconds: evaluationElapsedSeconds,
        validFromTick: tick,
        inputRevision: input.revisions.market,
      });
      this.marketFailureTicks = 0;
    } catch {
      this.marketFailureTicks += 1;
      if (this.marketFailureTicks <= this.graceTicks && this.hasCommitted) {
        return { committed: false, snapshot: this.snapshot, reason: 'FALLBACK' };
      }
      market = createNeutralMarketDecision(tick, input.revisions.market);
      this.fallbackCodes.push('MARKET_NEUTRAL_FALLBACK');
    }

    const player = this.playerManager.update({
      telemetry: input.revisions.player > 0 ? input.player : null,
      world: input.world,
      deltaSeconds,
      validFromTick: tick,
      inputRevision: input.revisions.player,
    });
    const pacing = this.pacingManager.update({
      elapsedSeconds: evaluationElapsedSeconds,
      validFromTick: tick,
      inputRevision,
    });
    const runConstants = input.run.constants;
    const position = this.positionManager.update({
      constants: runConstants,
      currentPrice: marketFrame?.price ?? 0,
      sourceSequence: marketFrame?.sourceSequence ?? 0,
      deltaSeconds,
      validFromTick: tick,
      inputRevision: Math.max(input.revisions.market, input.revisions.run),
    });
    const recovery = this.recoveryManager.update({
      recoveryNeed: player.value.recoveryNeed,
      advantage: position.value.advantage,
      regime: market.value.regime,
      regimeConfidence: market.value.confidence,
      deltaSeconds,
      elapsedSeconds: evaluationElapsedSeconds,
      seed: runConstants?.seed ?? 0,
      validFromTick: tick,
      inputRevision,
    });
    const combination = DIFFICULTY_RUNTIME_CONFIG.combination;
    const requestedPressure =
      pacing.value.baselinePressure +
      market.value.pressure * combination.marketPressureWeight +
      position.value.headwind * combination.positionHeadwindWeight +
      player.value.challengeAdjustment * combination.playerChallengeWeight;
    const reservation = this.threatManager.reserve({
      requestedPressure,
      minimumPressure: pacing.value.minimumPressure,
      maximumPressure: pacing.value.maximumPressure,
      mercy: recovery.value.mercy,
      deltaSeconds,
      requestedCredits:
        Math.max(0, requestedPressure) * combination.requestedCreditsAtMaximumPressure,
      validFromTick: tick,
      inputRevision,
    });
    const encounter = this.encounterManager.update({
      elapsedSeconds: evaluationElapsedSeconds,
      validFromTick: tick,
      inputRevision,
      seed: runConstants?.seed ?? 0,
      market: market.value,
      pacing: pacing.value,
      reservation,
      headwind: position.value.headwind,
      liquidationProximity: position.value.liquidationProximity,
      world: input.world,
    });

    this.snapshot = this.composer.compose({
      tick,
      elapsedSeconds: evaluationElapsedSeconds,
      inputRevision,
      inputRevisions: input.revisions,
      seed: runConstants?.seed ?? 0,
      world: input.world,
      market,
      player,
      position,
      pacing,
      recovery,
      reservation,
      encounter,
      fallbackCodes: this.fallbackCodes,
    });
    this.copyCommittedRevisions(input.revisions);
    this.hasCommitted = true;
    this.lastCadenceBucket = cadenceBucket;
    this.lastEvaluationElapsedSeconds = evaluationElapsedSeconds;
    return {
      committed: true,
      snapshot: this.snapshot,
      reason: this.fallbackCodes.length > 0 ? 'FALLBACK' : reason,
    };
  }

  public getSnapshot(): RuntimeDifficultySnapshot {
    return this.snapshot;
  }

  public reset(): void {
    this.marketManager.reset();
    this.playerManager.reset();
    this.positionManager.reset();
    this.pacingManager.reset();
    this.recoveryManager.reset();
    this.threatManager.reset();
    this.encounterManager.reset();
    this.composer.reset();
    this.committedRevisions.market = 0;
    this.committedRevisions.player = 0;
    this.committedRevisions.run = 0;
    this.committedRevisions.world = 0;
    this.fallbackCodes.length = 0;
    this.snapshot = createNeutralRuntimeDifficultySnapshot({
      tick: 0,
      inputRevision: 0,
    });
    this.hasCommitted = false;
    this.lastCadenceBucket = -1;
    this.lastEvaluationElapsedSeconds = 0;
    this.marketFailureTicks = 0;
  }

  private haveRevisionsChanged(revisions: Readonly<DifficultyRevisionVector>): boolean {
    return (
      revisions.market !== this.committedRevisions.market ||
      revisions.player !== this.committedRevisions.player ||
      revisions.run !== this.committedRevisions.run ||
      revisions.world !== this.committedRevisions.world
    );
  }

  private copyCommittedRevisions(revisions: Readonly<DifficultyRevisionVector>): void {
    this.committedRevisions.market = revisions.market;
    this.committedRevisions.player = revisions.player;
    this.committedRevisions.run = revisions.run;
    this.committedRevisions.world = revisions.world;
  }
}
