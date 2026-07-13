import {
  type DirectorInputFrame,
  type DirectorPacingSnapshot,
  type IntensitySnapshot,
  type MarketRegimeSnapshot,
  type PositionRiskSnapshot,
  type RunDirectorContext,
  type WorldPressureSnapshot,
} from './contracts';

export type DirectorInputSource = DirectorInputFrame;

/**
 * Copies mutable service observations at a simulation tick boundary. The
 * returned frame is reused in-place, so callers must consume it before the
 * next build call.
 */
export class DirectorInputBuilder {
  private readonly frame: DirectorInputFrame = {
    tick: 0,
    deltaSeconds: 0,
    pacing: {
      state: 'BUILD_UP',
      threatMultiplier: 1,
      remainingSeconds: 0,
    },
    market: {
      revision: 0,
      regime: 'CALM',
      confidence: 0,
      pressure: 0,
      volatility: 0,
      volume: 0,
      trend: 0,
      rsiExtremity: 0,
      whalePressure: 0,
      activeEventFamily: null,
      eventTelegraphEndsAtTick: null,
    },
    position: {
      sourceSequence: 0,
      alignment: 0,
      advantage: 0,
      headwind: 0,
      liquidationProximity: 0,
      leverageRisk: 0,
      isLiquidated: false,
    },
    player: {
      healthRatio: 1,
      combatMastery: 0,
      buildPower: 0,
      recentDamagePerSecond: 0,
      killsPerMinute: 0,
      mobilityUsage: 0,
      recentDamagePressure: 0,
      nearbyThreatPressure: 0,
      escapeResourcePressure: 0,
      recoveryNeed: 0,
    },
    world: {
      activeThreat: 0,
      activePrimaryEncounters: 0,
      activeSupportEncounters: 0,
      queuedEventFamily: null,
      doomStacks: 0,
    },
    run: {
      runId: '',
      seed: 0,
      mode: 'TOKEN',
      elapsedSeconds: 0,
      greedLevel: 0,
      isMarketStale: false,
    },
  };

  public build(source: DirectorInputSource): DirectorInputFrame {
    this.frame.tick = source.tick;
    this.frame.deltaSeconds = source.deltaSeconds;
    this.copyPacing(source.pacing);
    this.copyMarket(source.market);
    this.copyPosition(source.position);
    this.copyPlayer(source.player);
    this.copyWorld(source.world);
    this.copyRun(source.run);
    return this.frame;
  }

  private copyPacing(source: DirectorPacingSnapshot): void {
    const target = this.frame.pacing;
    target.state = source.state;
    target.threatMultiplier = source.threatMultiplier;
    target.remainingSeconds = source.remainingSeconds;
  }

  private copyMarket(source: MarketRegimeSnapshot): void {
    const target = this.frame.market;
    target.revision = source.revision;
    target.regime = source.regime;
    target.confidence = source.confidence;
    target.pressure = source.pressure;
    target.volatility = source.volatility;
    target.volume = source.volume;
    target.trend = source.trend;
    target.rsiExtremity = source.rsiExtremity;
    target.whalePressure = source.whalePressure;
    target.activeEventFamily = source.activeEventFamily;
    target.eventTelegraphEndsAtTick = source.eventTelegraphEndsAtTick;
  }

  private copyPosition(source: PositionRiskSnapshot): void {
    const target = this.frame.position;
    target.sourceSequence = source.sourceSequence;
    target.alignment = source.alignment;
    target.advantage = source.advantage;
    target.headwind = source.headwind;
    target.liquidationProximity = source.liquidationProximity;
    target.leverageRisk = source.leverageRisk;
    target.isLiquidated = source.isLiquidated;
  }

  private copyPlayer(source: IntensitySnapshot): void {
    const target = this.frame.player;
    target.healthRatio = source.healthRatio;
    target.combatMastery = source.combatMastery;
    target.buildPower = source.buildPower;
    target.recentDamagePerSecond = source.recentDamagePerSecond;
    target.killsPerMinute = source.killsPerMinute;
    target.mobilityUsage = source.mobilityUsage;
    target.recentDamagePressure = source.recentDamagePressure;
    target.nearbyThreatPressure = source.nearbyThreatPressure;
    target.escapeResourcePressure = source.escapeResourcePressure;
    target.recoveryNeed = source.recoveryNeed;
  }

  private copyWorld(source: WorldPressureSnapshot): void {
    const target = this.frame.world;
    target.activeThreat = source.activeThreat;
    target.activePrimaryEncounters = source.activePrimaryEncounters;
    target.activeSupportEncounters = source.activeSupportEncounters;
    target.queuedEventFamily = source.queuedEventFamily;
    target.doomStacks = source.doomStacks;
  }

  private copyRun(source: RunDirectorContext): void {
    const target = this.frame.run;
    target.runId = source.runId;
    target.seed = source.seed;
    target.mode = source.mode;
    target.elapsedSeconds = source.elapsedSeconds;
    target.greedLevel = source.greedLevel;
    target.isMarketStale = source.isMarketStale;
  }
}
