import { MarketPosition } from '../../types';
import { IntensityModel } from '../engagement/IntensityModel';
import { MarketRegimeEngine } from '../market/regime/MarketRegimeEngine';
import { DIRECTOR_CONFIG_V1, type DirectorConfigV1 } from './config/DirectorConfigV1';
import {
  type GameplayRunMode,
  type GameplaySnapshot,
  type PacingState,
  type PositionRiskSnapshot,
  type SpawnPlan,
} from './contracts';
import { DirectorInputBuilder } from './DirectorInputBuilder';
import { ExperienceDirector } from './ExperienceDirector';
import { PositionRiskModel } from './position/PositionRiskModel';
import { SpawnPlanBuilder, type SpawnPlanWorldInput } from './SpawnPlanBuilder';
import { type CanonicalMarketFrame } from '../../types/marketCanonical';

export type DirectorSpawnOrchestratorInput = {
  tick: number;
  deltaSeconds: number;
  marketFrame: CanonicalMarketFrame;
  run: {
    runId: string;
    seed: number;
    elapsedSeconds: number;
    mode: GameplayRunMode;
    greedLevel: number;
  };
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
    maxActiveEnemies: number;
    activePrimaryEncounters: number;
    activeSupportEncounters: number;
  };
};

export type DirectorSpawnOrchestratorOutput = {
  snapshot: GameplaySnapshot;
  plan: SpawnPlan;
  position: PositionRiskSnapshot;
};

const EMPTY_SPAWN_PLAN: SpawnPlan = {
  revision: 0,
  seed: 0,
  spendableThreat: 0,
  composition: [],
  statTier: 0,
  maxActiveEnemies: 0,
  spawnWindowSeconds: 0,
  intents: [],
};

const EMPTY_POSITION_RISK: PositionRiskSnapshot = {
  sourceSequence: 0,
  alignment: 0,
  advantage: 0,
  headwind: 0,
  liquidationProximity: 0,
  leverageRisk: 0,
  isLiquidated: false,
};

export const deriveDirectorSeed = (runId: string): number => {
  let seed = 2_166_136_261;
  for (let index = 0; index < runId.length; index += 1) {
    seed = Math.imul(seed ^ runId.charCodeAt(index), 16_777_619);
  }
  return seed >>> 0;
};

/**
 * Canonical runtime bridge for the spawn vertical slice. It translates locked
 * market and run inputs into a Director-owned SpawnPlan; SpawnExecutor still
 * receives only that plan and the world state.
 */
export class DirectorSpawnOrchestrator {
  private readonly config: DirectorConfigV1;
  private readonly inputBuilder = new DirectorInputBuilder();
  private marketRegime: MarketRegimeEngine;
  private positionRisk: PositionRiskModel;
  private readonly intensity = new IntensityModel();
  private readonly director: ExperienceDirector;
  private readonly planBuilder: SpawnPlanBuilder;
  private readonly emptyPlan: SpawnPlan = { ...EMPTY_SPAWN_PLAN };
  private readonly emptyPositionRisk: PositionRiskSnapshot = { ...EMPTY_POSITION_RISK };
  private readonly output: DirectorSpawnOrchestratorOutput;
  private readonly planWorld: SpawnPlanWorldInput = {
    width: 0,
    height: 0,
    activeEnemies: 0,
    maxActiveEnemies: 0,
    position: MarketPosition.LONG,
  };
  private lastUpdatedElapsedSeconds = -Infinity;
  private lastMarketRevision = -1;

  public constructor(config: DirectorConfigV1 = DIRECTOR_CONFIG_V1) {
    this.config = config;
    this.marketRegime = new MarketRegimeEngine(config);
    this.positionRisk = new PositionRiskModel(config);
    this.director = new ExperienceDirector(config);
    this.planBuilder = new SpawnPlanBuilder(config);
    this.output = {
      snapshot: this.director.getSnapshot(),
      plan: this.emptyPlan,
      position: this.emptyPositionRisk,
    };
  }

  public update(
    input: DirectorSpawnOrchestratorInput
  ): DirectorSpawnOrchestratorOutput {
    if (!this.shouldUpdate(input)) {
      this.output.snapshot = this.director.getSnapshot();
      this.output.plan = this.createEmptyPlan(this.output.snapshot, input);
      return this.output;
    }

    const market = this.marketRegime.update(input.marketFrame).snapshot;
    const position = this.positionRisk.update({
      sequence: input.marketFrame.sequence,
      deltaSeconds: input.deltaSeconds,
      currentPrice: input.marketFrame.price,
      entryPrice: input.position.entryPrice,
      side: input.position.side,
      leverage: input.position.leverage,
      liquidationPrice: input.position.liquidationPrice,
    });
    const nearbyThreatPressure = this.toUnit(
      input.world.activeEnemies / Math.max(1, input.world.maxActiveEnemies)
    );
    const player = this.intensity.update({
      deltaSeconds: input.deltaSeconds,
      hpRatio: input.player.hpRatio,
      damageTakenPerSecond: input.player.damageTakenPerSecond,
      nearbyThreatPressure,
      escapeResourcePressure: nearbyThreatPressure,
      killsPerMinute: input.player.killsPerMinute,
      combatMastery: input.player.combatMastery,
      buildPower: input.player.buildPower,
      mobilityUsage: input.player.mobilityUsage,
    });
    const pacing = this.getPacing(input.run.elapsedSeconds);
    const snapshot = this.director.update(
      this.inputBuilder.build({
        tick: input.tick,
        deltaSeconds: input.deltaSeconds,
        pacing,
        market,
        position,
        player,
        world: {
          activeThreat: input.world.activeEnemies,
          activePrimaryEncounters: input.world.activePrimaryEncounters,
          activeSupportEncounters: input.world.activeSupportEncounters,
          queuedEventFamily: null,
          doomStacks: 0,
        },
        run: {
          runId: input.run.runId,
          seed: input.run.seed,
          mode: input.run.mode,
          elapsedSeconds: input.run.elapsedSeconds,
          greedLevel: input.run.greedLevel,
          isMarketStale: input.marketFrame.quality === 'STALE',
        },
      })
    );

    this.lastUpdatedElapsedSeconds = input.run.elapsedSeconds;
    this.lastMarketRevision = input.marketFrame.revision;
    this.output.snapshot = snapshot;
    this.output.position = position;
    this.output.plan =
      input.marketFrame.quality === 'STALE' || snapshot.validFromTick !== input.tick
        ? this.createEmptyPlan(snapshot, input)
        : this.planBuilder.buildCurrent({
            tick: input.tick,
            seed: input.run.seed,
            snapshot,
            world: this.updatePlanWorld(input),
          });
    return this.output;
  }

  public reset(): void {
    this.marketRegime = new MarketRegimeEngine(this.config);
    this.positionRisk = new PositionRiskModel(this.config);
    this.intensity.reset();
    this.director.reset();
    this.output.snapshot = this.director.getSnapshot();
    this.output.plan = this.emptyPlan;
    this.output.position = this.emptyPositionRisk;
    this.lastUpdatedElapsedSeconds = -Infinity;
    this.lastMarketRevision = -1;
  }

  private getPacing(elapsedSeconds: number): {
    state: PacingState;
    threatMultiplier: number;
    remainingSeconds: number;
  } {
    if (elapsedSeconds >= this.config.survival.doomStartsAtSeconds) {
      return {
        state: 'DOOM',
        threatMultiplier: this.config.pacing.peak.threatMultiplier,
        remainingSeconds: 0,
      };
    }

    const buildUp = this.config.pacing.buildUp;
    const peak = this.config.pacing.peak;
    const peakFade = this.config.pacing.peakFade;
    const recovery = this.config.pacing.recovery;
    const cycleSeconds =
      buildUp.maxSeconds + peak.maxSeconds + peakFade.maxSeconds + recovery.maxSeconds;
    const cycleElapsed = elapsedSeconds % cycleSeconds;

    if (cycleElapsed < buildUp.maxSeconds) {
      return {
        state: 'BUILD_UP',
        threatMultiplier: buildUp.threatMultiplier,
        remainingSeconds: buildUp.maxSeconds - cycleElapsed,
      };
    }
    if (cycleElapsed < buildUp.maxSeconds + peak.maxSeconds) {
      return {
        state: 'PEAK',
        threatMultiplier: peak.threatMultiplier,
        remainingSeconds: buildUp.maxSeconds + peak.maxSeconds - cycleElapsed,
      };
    }
    if (cycleElapsed < buildUp.maxSeconds + peak.maxSeconds + peakFade.maxSeconds) {
      return {
        state: 'PEAK_FADE',
        threatMultiplier: peakFade.threatMultiplier,
        remainingSeconds:
          buildUp.maxSeconds + peak.maxSeconds + peakFade.maxSeconds - cycleElapsed,
      };
    }

    return {
      state: 'RECOVERY',
      threatMultiplier: recovery.threatMultiplier,
      remainingSeconds: cycleSeconds - cycleElapsed,
    };
  }

  private shouldUpdate(input: DirectorSpawnOrchestratorInput): boolean {
    if (input.marketFrame.revision !== this.lastMarketRevision) return true;
    return (
      input.run.elapsedSeconds - this.lastUpdatedElapsedSeconds >=
      1 / this.config.runtime.updateFrequencyHz
    );
  }

  private createEmptyPlan(
    snapshot: GameplaySnapshot,
    input: DirectorSpawnOrchestratorInput
  ): SpawnPlan {
    this.emptyPlan.revision = snapshot.revision;
    this.emptyPlan.seed = input.run.seed;
    this.emptyPlan.maxActiveEnemies = input.world.maxActiveEnemies;
    this.emptyPlan.spawnWindowSeconds = 1 / this.config.runtime.updateFrequencyHz;
    return this.emptyPlan;
  }

  private updatePlanWorld(input: DirectorSpawnOrchestratorInput): SpawnPlanWorldInput {
    this.planWorld.width = input.world.width;
    this.planWorld.height = input.world.height;
    this.planWorld.activeEnemies = input.world.activeEnemies;
    this.planWorld.maxActiveEnemies = input.world.maxActiveEnemies;
    this.planWorld.position = input.position.side;
    return this.planWorld;
  }

  private toUnit(value: number): number {
    return Math.min(1, Math.max(0, value));
  }
}
