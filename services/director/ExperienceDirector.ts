import {
  AdvantageAllocator,
  type AdvantageAllocationInput,
} from './AdvantageAllocator';
import { DIRECTOR_CONFIG_V1, type DirectorConfigV1 } from './config/DirectorConfigV1';
import {
  type DirectorInputFrame,
  type GameplaySnapshot,
  type MarketEventFamily,
  type MarketRegimeSnapshot,
} from './contracts';
import { EncounterPlanner } from './EncounterPlanner';
import { SurvivalCurve } from './SurvivalCurve';
import { ThreatBudgetAllocator } from './ThreatBudgetAllocator';

export const DIRECTOR_REASON_CODES = [
  'FIXED_RATE_UPDATE',
  'MARKET_EVENT_TRIGGER',
  'MARKET_STALE_NEUTRALIZED',
] as const;

export type DirectorReasonCode = (typeof DIRECTOR_REASON_CODES)[number];

export const DIRECTOR_GUARDRAIL_CODES = ['THREAT_TARGET_MAXIMUM'] as const;

export type DirectorGuardrailCode = (typeof DIRECTOR_GUARDRAIL_CODES)[number];

export type DirectorDecisionTrace = {
  tick: number;
  revision: number;
  reasonCodes: DirectorReasonCode[];
  guardrailCodes: DirectorGuardrailCode[];
};

const FIRST_REVISION = 0;
const ZERO_SECONDS = 0;
const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

/**
 * The single pure gameplay decision authority. It does not import EventBus,
 * React, stores, audio, combat, or reward services; callers decide whether a
 * shadow snapshot is merely recorded or eventually applied by an executor.
 */
export class ExperienceDirector {
  private readonly config: DirectorConfigV1;
  private readonly survivalCurve: SurvivalCurve;
  private readonly threatAllocator: ThreatBudgetAllocator;
  private readonly advantageAllocator: AdvantageAllocator;
  private readonly encounterPlanner: EncounterPlanner;
  private readonly snapshot: GameplaySnapshot = {
    revision: FIRST_REVISION,
    validFromTick: FIRST_REVISION,
    pacing: {
      state: 'BUILD_UP',
      threatMultiplier: 1,
      remainingSeconds: ZERO_SECONDS,
    },
    threat: {
      target: DIRECTOR_CONFIG_V1.threat.minimumTarget,
      creditRate: ZERO_SECONDS,
      availableCredits: ZERO_SECONDS,
      maximumCredits: ZERO_SECONDS,
    },
    advantage: {
      creditRate: ZERO_SECONDS,
      availableCredits: ZERO_SECONDS,
      maximumCredits: ZERO_SECONDS,
      activeMechanic: null,
    },
    environment: {
      regime: 'CALM',
      presentationIntensity: ZERO_SECONDS,
      isFavorable: false,
    },
    encounter: {
      activeEventFamily: null,
      canStartMarketSurge: false,
      queuedEventFamily: null,
      phase: 'IDLE',
      primaryCardId: null,
      supportCardId: null,
      headwindChannels: [],
    },
  };
  private readonly trace: DirectorDecisionTrace = {
    tick: FIRST_REVISION,
    revision: FIRST_REVISION,
    reasonCodes: [],
    guardrailCodes: [],
  };
  private readonly staleMarketSnapshot: MarketRegimeSnapshot = {
    revision: FIRST_REVISION,
    regime: 'CALM',
    confidence: ZERO_SECONDS,
    pressure: ZERO_SECONDS,
    volatility: ZERO_SECONDS,
    volume: ZERO_SECONDS,
    trend: ZERO_SECONDS,
    rsiExtremity: ZERO_SECONDS,
    whalePressure: ZERO_SECONDS,
    activeEventFamily: null,
    eventTelegraphEndsAtElapsedSeconds: null,
  };
  private lastProcessedTick: number | null = null;
  private lastUpdatedElapsedSeconds = ZERO_SECONDS;
  private lastEventFamily: MarketEventFamily | null = null;
  private lastEventRevision: number | null = null;
  private lastGreedLevel = -1;
  private readonly advantageInput: AdvantageAllocationInput = {
    deltaSeconds: 0,
    advantage: 0,
    regime: 'CALM',
    regimeConfidence: 0,
    elapsedSeconds: 0,
    seed: 0,
  };

  public constructor(config: DirectorConfigV1 = DIRECTOR_CONFIG_V1) {
    this.config = config;
    this.survivalCurve = new SurvivalCurve(config);
    this.threatAllocator = new ThreatBudgetAllocator(config);
    this.advantageAllocator = new AdvantageAllocator(config);
    this.encounterPlanner = new EncounterPlanner(config);
  }

  public update(frame: DirectorInputFrame): GameplaySnapshot {
    if (!this.shouldUpdate(frame)) return this.snapshot;

    const updateDeltaSeconds = this.getUpdateDeltaSeconds(frame);
    const marketPressure = clamp(
      frame.market.pressure,
      this.config.marketPressure.minimum,
      this.config.marketPressure.maximum
    );
    const greedPressure = Math.min(
      this.config.greed.maximumPressure,
      this.config.greed.pressurePerLevel * Math.max(ZERO_SECONDS, frame.run.greedLevel)
    );
    const encounter = this.encounterPlanner.plan({
      elapsedSeconds: frame.run.elapsedSeconds,
      seed: frame.run.seed,
      market: this.getEncounterMarket(frame),
      headwind: frame.position.headwind,
      liquidationProximity: frame.position.liquidationProximity,
      availableCredits: Number.MAX_SAFE_INTEGER,
      world: frame.world,
    });
    const encounterPressure =
      encounter.phase === 'ACTIVE' ? marketPressure : ZERO_SECONDS;
    const threat = this.threatAllocator.update({
      deltaSeconds: updateDeltaSeconds,
      survivalPressure: this.survivalCurve.getPressure(frame.run.elapsedSeconds),
      marketPressure,
      headwind: frame.position.headwind,
      greedPressure,
      encounterPressure,
      pacingThreatMultiplier: frame.pacing.threatMultiplier,
    });
    const advantageInput = this.advantageInput;
    advantageInput.deltaSeconds = updateDeltaSeconds;
    advantageInput.advantage = frame.position.advantage;
    advantageInput.regime = frame.market.regime;
    advantageInput.regimeConfidence = frame.market.confidence;
    advantageInput.elapsedSeconds = frame.run.elapsedSeconds;
    advantageInput.seed = frame.run.seed;
    if (frame.run.isMarketStale) {
      this.advantageAllocator.freeze(frame.run.elapsedSeconds);
    } else {
      this.advantageAllocator.update(advantageInput);
      const advantagePlan = this.advantageAllocator.planNext(advantageInput);
      if (advantagePlan !== null) this.advantageAllocator.activate(advantagePlan);
    }
    const advantage = this.advantageAllocator.getSnapshot();

    this.writeSnapshot(frame, encounter, threat, advantage);
    this.writeTrace(frame, threat.isTargetClamped);
    this.lastProcessedTick = frame.tick;
    this.lastUpdatedElapsedSeconds = frame.run.elapsedSeconds;
    this.lastEventFamily = frame.run.isMarketStale
      ? null
      : frame.market.activeEventFamily;
    this.lastEventRevision = frame.run.isMarketStale ? null : frame.market.revision;
    this.lastGreedLevel = frame.run.greedLevel;
    return this.snapshot;
  }

  public reserveThreatCredits(requestedCredits: number): number {
    const reservedCredits = this.threatAllocator.spend(requestedCredits);
    this.snapshot.threat.availableCredits =
      this.threatAllocator.getSnapshot().availableCredits;
    return reservedCredits;
  }

  public getSnapshot(): GameplaySnapshot {
    return this.snapshot;
  }

  public getLastTrace(): DirectorDecisionTrace {
    return this.trace;
  }

  public reset(): void {
    this.snapshot.revision = FIRST_REVISION;
    this.snapshot.validFromTick = FIRST_REVISION;
    this.lastProcessedTick = null;
    this.lastUpdatedElapsedSeconds = ZERO_SECONDS;
    this.lastEventFamily = null;
    this.lastEventRevision = null;
    this.lastGreedLevel = -1;
    this.trace.tick = FIRST_REVISION;
    this.trace.revision = FIRST_REVISION;
    this.trace.reasonCodes.length = ZERO_SECONDS;
    this.trace.guardrailCodes.length = ZERO_SECONDS;
    this.threatAllocator.reset();
    this.advantageAllocator.reset();
    this.encounterPlanner.reset();
  }

  private shouldUpdate(frame: DirectorInputFrame): boolean {
    if (this.lastProcessedTick === null) return true;
    if (frame.tick === this.lastProcessedTick) return false;
    if (frame.run.greedLevel !== this.lastGreedLevel) return true;
    if (this.isNewMarketEvent(frame)) return true;

    const minimumUpdateSeconds = 1 / this.config.runtime.updateFrequencyHz;
    return (
      frame.run.elapsedSeconds - this.lastUpdatedElapsedSeconds >= minimumUpdateSeconds
    );
  }

  private isNewMarketEvent(frame: DirectorInputFrame): boolean {
    const eventFamily = frame.run.isMarketStale ? null : frame.market.activeEventFamily;
    return (
      eventFamily !== null &&
      (eventFamily !== this.lastEventFamily ||
        frame.market.revision !== this.lastEventRevision)
    );
  }

  private getUpdateDeltaSeconds(frame: DirectorInputFrame): number {
    if (this.lastProcessedTick === null) {
      return Math.max(ZERO_SECONDS, frame.deltaSeconds);
    }
    return Math.max(
      ZERO_SECONDS,
      frame.run.elapsedSeconds - this.lastUpdatedElapsedSeconds
    );
  }

  private getEncounterMarket(frame: DirectorInputFrame): MarketRegimeSnapshot {
    if (!frame.run.isMarketStale) return frame.market;

    const target = this.staleMarketSnapshot;
    const source = frame.market;
    target.revision = source.revision;
    target.regime = source.regime;
    target.confidence = source.confidence;
    target.pressure = source.pressure;
    target.volatility = source.volatility;
    target.volume = source.volume;
    target.trend = source.trend;
    target.rsiExtremity = source.rsiExtremity;
    target.whalePressure = source.whalePressure;
    target.activeEventFamily = null;
    target.eventTelegraphEndsAtElapsedSeconds = null;
    return target;
  }

  private writeSnapshot(
    frame: DirectorInputFrame,
    encounter: ReturnType<EncounterPlanner['plan']>,
    threat: ReturnType<ThreatBudgetAllocator['update']>,
    advantage: ReturnType<AdvantageAllocator['update']>
  ): void {
    this.snapshot.revision += 1;
    this.snapshot.validFromTick = frame.tick;
    this.snapshot.pacing.state = frame.pacing.state;
    this.snapshot.pacing.threatMultiplier = frame.pacing.threatMultiplier;
    this.snapshot.pacing.remainingSeconds = frame.pacing.remainingSeconds;
    this.snapshot.threat.target = threat.target;
    this.snapshot.threat.creditRate = threat.creditRate;
    this.snapshot.threat.availableCredits = threat.availableCredits;
    this.snapshot.threat.maximumCredits = threat.maximumCredits;
    this.snapshot.advantage.creditRate = advantage.creditRate;
    this.snapshot.advantage.availableCredits = advantage.availableCredits;
    this.snapshot.advantage.maximumCredits = advantage.maximumCredits;
    this.snapshot.advantage.activeMechanic = advantage.activeMechanic;
    this.snapshot.environment.regime = frame.market.regime;
    this.snapshot.environment.presentationIntensity = Math.max(
      frame.market.confidence,
      Math.abs(frame.position.alignment)
    );
    this.snapshot.environment.isFavorable = frame.position.advantage > ZERO_SECONDS;
    this.snapshot.encounter.activeEventFamily = frame.run.isMarketStale
      ? null
      : frame.market.activeEventFamily;
    this.snapshot.encounter.canStartMarketSurge =
      !frame.run.isMarketStale &&
      frame.market.activeEventFamily !== null &&
      frame.run.elapsedSeconds >= this.config.marketEvents.initialSurgeLockoutSeconds;
    this.snapshot.encounter.queuedEventFamily = frame.world.queuedEventFamily;
    this.snapshot.encounter.phase = encounter.phase;
    this.snapshot.encounter.primaryCardId = encounter.primary?.id ?? null;
    this.snapshot.encounter.supportCardId = encounter.support?.id ?? null;
    const targetChannels = this.snapshot.encounter.headwindChannels;
    targetChannels.length = ZERO_SECONDS;
    for (const channel of encounter.headwindChannels) targetChannels.push(channel);
  }

  private writeTrace(frame: DirectorInputFrame, isThreatTargetClamped: boolean): void {
    this.trace.tick = frame.tick;
    this.trace.revision = this.snapshot.revision;
    this.trace.reasonCodes.length = ZERO_SECONDS;
    this.trace.guardrailCodes.length = ZERO_SECONDS;
    this.trace.reasonCodes.push('FIXED_RATE_UPDATE');
    if (this.isNewMarketEvent(frame)) {
      this.trace.reasonCodes.push('MARKET_EVENT_TRIGGER');
    }
    if (frame.run.isMarketStale) {
      this.trace.reasonCodes.push('MARKET_STALE_NEUTRALIZED');
    }
    if (isThreatTargetClamped) this.trace.guardrailCodes.push('THREAT_TARGET_MAXIMUM');
  }
}

export const createGameplaySnapshotHash = (snapshot: GameplaySnapshot): string => {
  const serialized = JSON.stringify(snapshot);
  let hash = FNV_OFFSET_BASIS;

  for (let index = ZERO_SECONDS; index < serialized.length; index += 1) {
    hash = Math.imul(hash ^ serialized.charCodeAt(index), FNV_PRIME);
  }

  return (hash >>> ZERO_SECONDS).toString(16).padStart(8, '0');
};
