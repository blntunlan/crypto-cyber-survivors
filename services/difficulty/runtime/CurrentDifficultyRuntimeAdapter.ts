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
import { type DifficultyBoundaryInput } from './DifficultyRuntime';

export type CurrentDifficultyRuntimeDecision = {
  snapshot: GameplaySnapshot | null;
  plan: SpawnPlan;
  position: PositionRiskSnapshot;
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
  };

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
    return this.orchestrator.update(target);
  }

  public reset(): void {
    this.orchestrator.reset();
    this.emptyPlan.revision = 0;
    this.emptyPlan.seed = 0;
    this.emptyPlan.maxActiveEnemies = 0;
  }
}
