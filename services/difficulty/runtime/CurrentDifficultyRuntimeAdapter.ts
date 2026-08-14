import { MarketPosition } from '../../../types';
import {
  DirectorSpawnOrchestrator,
  type DirectorSpawnOrchestratorInput,
} from '../../director/DirectorSpawnOrchestrator';
import {
  type GameplaySnapshot,
  type PositionRiskSnapshot,
  type SpawnPlan,
} from '../../director/contracts';
import { type DirectorContractViolation } from '../../director/DirectorContractGuard';
import {
  RunPerformanceTracker,
  type RunPerformanceSnapshot,
} from '../../director/RunPerformanceTracker';
import { EventBus } from '../../core/EventBus';
import { Logger } from '../../system/Logger';
import { type DifficultyBoundaryInput } from './DifficultyRuntime';

export type CurrentDifficultyRuntimeDecision = {
  snapshot: GameplaySnapshot | null;
  plan: SpawnPlan;
  position: PositionRiskSnapshot;
  violations: readonly DirectorContractViolation[];
};

const NO_VIOLATIONS: readonly DirectorContractViolation[] = [];

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

const createEmptyPosition = (): PositionRiskSnapshot => ({
  sourceSequence: 0,
  alignment: 0,
  advantage: 0,
  headwind: 0,
  liquidationProximity: 0,
  leverageRisk: 0,
  isLiquidated: false,
});

const createInput = (): DirectorSpawnOrchestratorInput => ({
  tick: 0,
  deltaSeconds: 0,
  marketFrame: {
    revision: 0,
    sequence: 0,
    sourceSequence: 0,
    sourceTimestamp: 0,
    receivedAt: 0,
    quality: 'STALE',
    price: 0,
    pnlPercent: 0,
    rsi: 50,
    rsiState: 'NEUTRAL',
    atrPercent: 0,
    normalizedVolume: 0,
    whaleTier: 0,
    macd: { value: 0, signal: 0, histogram: 0 },
    priceChangePercent: 0,
    trendStrength: 0,
    trendDirection: 'SIDEWAYS',
    source: 'fallback',
  },
  run: {
    runId: '',
    seed: 0,
    elapsedSeconds: 0,
    mode: 'TOKEN',
    greedLevel: 0,
  },
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
    maxActiveEnemies: 0,
    activePrimaryEncounters: 0,
    activeSupportEncounters: 0,
  },
});

export class CurrentDifficultyRuntimeAdapter {
  private readonly orchestrator = new DirectorSpawnOrchestrator();
  private readonly input = createInput();
  private readonly emptyPlan = createEmptyPlan();
  private readonly emptyPosition = createEmptyPosition();
  private readonly emptyDecision: CurrentDifficultyRuntimeDecision = {
    snapshot: null,
    plan: this.emptyPlan,
    position: this.emptyPosition,
    violations: NO_VIOLATIONS,
  };
  private readonly reportedViolations = new Set<DirectorContractViolation>();
  private readonly performance = new RunPerformanceTracker();
  private lastDoomStacks = 0;
  private lastGreedLevel = 0;

  public commitAtBoundary(
    boundary: DifficultyBoundaryInput
  ): CurrentDifficultyRuntimeDecision {
    if (boundary.marketFrame === null || boundary.run === null) {
      this.emptyPlan.revision = 0;
      this.emptyPlan.seed = boundary.run?.seed ?? 0;
      this.emptyPlan.maxActiveEnemies = boundary.world.maximumEnemies;
      return this.emptyDecision;
    }

    const target = this.input;
    const run = boundary.run;
    const position = boundary.position;
    const player = boundary.player;
    const world = boundary.world;
    target.tick = boundary.tick;
    target.deltaSeconds = boundary.deltaSeconds;
    target.marketFrame = boundary.marketFrame;
    target.run.runId = run.runId;
    target.run.seed = run.seed;
    target.run.elapsedSeconds = boundary.elapsedSeconds;
    target.run.mode = run.mode;
    target.run.greedLevel = run.greedLevel;
    target.position.side = position.side;
    target.position.leverage = position.leverage;
    target.position.entryPrice = position.entryPrice;
    target.position.liquidationPrice = position.liquidationPrice;
    target.player.hpRatio = player.hpRatio;
    target.player.damageTakenPerSecond = player.damageTakenPerSecond;
    target.player.killsPerMinute = player.killsPerMinute;
    target.player.combatMastery = player.combatMastery;
    target.player.buildPower = player.buildPower;
    target.player.mobilityUsage = player.mobilityUsage;
    target.world.width = world.width;
    target.world.height = world.height;
    target.world.activeEnemies = world.activeEnemies;
    target.world.maxActiveEnemies = world.maximumEnemies;
    target.world.activePrimaryEncounters = world.activePrimaryEncounters;
    target.world.activeSupportEncounters = world.activeSupportEncounters;
    const decision = this.orchestrator.update(target);
    this.performance.record(
      decision.position.alignment,
      player.combatMastery,
      boundary.deltaSeconds
    );
    this.reportViolations(decision.violations, boundary.tick);
    this.reportProgression(decision.snapshot);
    return decision;
  }

  /** Lets the runtime keep Director-owned safe routes free of spawns (§10). */
  public setBlockedPositionQuery(query: (x: number, y: number) => boolean): void {
    this.orchestrator.setBlockedPositionQuery(query);
  }

  /** Run-long §14/§17 metrics for settlement and the end-of-run summary. */
  public getRunPerformance(): RunPerformanceSnapshot {
    return this.performance.getSnapshot();
  }

  public reset(): void {
    this.orchestrator.reset();
    this.performance.reset();
    this.reportedViolations.clear();
    this.lastDoomStacks = 0;
    this.lastGreedLevel = 0;
    this.emptyPlan.revision = 0;
    this.emptyPlan.seed = 0;
    this.emptyPlan.maxActiveEnemies = 0;
  }

  /**
   * Doom and Greed only ever escalate, so the HUD is told on the transition
   * rather than polled every commit (contract §8/§17).
   */
  private reportProgression(snapshot: GameplaySnapshot | null): void {
    if (snapshot === null) return;
    const doomStacks = snapshot.pacing.doomStacks;
    const greedLevel = snapshot.greed.level;
    if (doomStacks <= this.lastDoomStacks && greedLevel <= this.lastGreedLevel) return;

    this.lastDoomStacks = Math.max(this.lastDoomStacks, doomStacks);
    this.lastGreedLevel = Math.max(this.lastGreedLevel, greedLevel);
    EventBus.emit('directorProgressionChanged', {
      doomStacks: this.lastDoomStacks,
      greedLevel: this.lastGreedLevel,
      supportEfficiency: snapshot.pacing.supportEfficiency,
    });
  }

  /**
   * The Director stays side-effect free, so the runtime boundary owns
   * reporting. Each code is logged once per run: a broken contract rule should
   * be impossible to miss without drowning the console at 5Hz.
   */
  private reportViolations(
    violations: readonly DirectorContractViolation[],
    tick: number
  ): void {
    for (let index = 0; index < violations.length; index += 1) {
      const violation = violations[index];
      if (violation === undefined || this.reportedViolations.has(violation)) continue;
      this.reportedViolations.add(violation);
      Logger.error(
        `[Director] Contract violation ${violation} at tick ${tick} — see Final Design Contract v1.0`
      );
    }
  }
}
