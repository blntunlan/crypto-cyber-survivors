import {
  MARKET_EVENT_FAMILIES,
  type MarketEventFamily,
  type MarketRegimeSnapshot,
  type WorldPressureSnapshot,
} from '../../../director/contracts';
import { DIRECTOR_CONFIG_V1 } from '../../../director/config/DirectorConfigV1';
import { EncounterPlanner } from '../../../director/EncounterPlanner';
import {
  type DecisionQuality,
  type DifficultyReasonCode,
  type EncounterDecisionSummary,
} from '../../../../types/runtimeDifficulty';
import { type EncounterDecision, type EncounterManagerInput } from '../contracts';

type MutableEncounterDecision = {
  revision: number;
  validFromTick: number;
  inputRevision: number;
  quality: DecisionQuality;
  value: Omit<EncounterDecisionSummary, 'headwindChannels' | 'reasonCodes'> & {
    headwindChannels: string[];
    reasonCodes: DifficultyReasonCode[];
  };
  reasonCodes: DifficultyReasonCode[];
  clampCodes: [];
};

const createNeutralDecision = (): MutableEncounterDecision => ({
  revision: 0,
  validFromTick: 0,
  inputRevision: 0,
  quality: 'NEUTRAL',
  value: {
    phase: 'IDLE',
    family: null,
    primaryCardId: null,
    supportCardId: null,
    headwindChannels: [],
    statModifiers: {
      healthMultiplier: 1,
      damageMultiplier: 1,
      speedMultiplier: 1,
      spawnDensityMultiplier: 1,
    },
    reservedCredits: 0,
    reasonCodes: ['ENCOUNTER_IDLE'],
  },
  reasonCodes: ['ENCOUNTER_IDLE'],
  clampCodes: [],
});

const isMarketEventFamily = (value: string): value is MarketEventFamily =>
  (MARKET_EVENT_FAMILIES as readonly string[]).includes(value);

export class EncounterManager {
  private readonly decisions: [MutableEncounterDecision, MutableEncounterDecision] = [
    createNeutralDecision(),
    createNeutralDecision(),
  ];
  private readonly planner = new EncounterPlanner();
  private readonly marketSnapshot: MarketRegimeSnapshot = {
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
    eventTelegraphEndsAtElapsedSeconds: null,
  };
  private readonly worldSnapshot: WorldPressureSnapshot = {
    activeThreat: 0,
    activePrimaryEncounters: 0,
    activeSupportEncounters: 0,
    queuedEventFamily: null,
    doomStacks: 0,
  };
  private activeDecisionIndex = 0;
  private lastEventSourceSequence = -1;
  private activeFamily: MarketEventFamily | null = null;

  public update(input: EncounterManagerInput): EncounterDecision {
    const current = this.getActiveDecision();
    const nextIndex = this.activeDecisionIndex === 0 ? 1 : 0;
    const target = nextIndex === 0 ? this.decisions[0] : this.decisions[1];
    target.revision = current.revision + 1;
    target.validFromTick = input.validFromTick;
    target.inputRevision = input.inputRevision;
    target.reasonCodes.length = 0;
    target.value.reasonCodes.length = 0;
    target.value.headwindChannels.length = 0;

    if (!this.isValid(input)) {
      this.writeIdle(target, 'NEUTRAL');
      this.activeDecisionIndex = nextIndex;
      return target;
    }

    const rawFamily = input.market.activeEventFamily;
    const family =
      rawFamily !== null && isMarketEventFamily(rawFamily) ? rawFamily : null;
    const isNewEvent =
      input.market.quality === 'LIVE' &&
      family !== null &&
      input.market.sourceSequence !== this.lastEventSourceSequence;
    if (isNewEvent) {
      this.lastEventSourceSequence = input.market.sourceSequence;
      this.activeFamily = family;
    }

    this.copyMarket(input, isNewEvent ? family : null);
    this.copyWorld(input);
    const plan = this.planner.plan({
      elapsedSeconds: input.elapsedSeconds,
      seed: input.seed,
      market: this.marketSnapshot,
      headwind: input.headwind,
      liquidationProximity: input.liquidationProximity,
      availableCredits: input.reservation.reservedCredits,
      world: this.worldSnapshot,
    });
    if (plan.phase === 'IDLE') this.activeFamily = null;

    target.quality = 'LIVE';
    target.value.phase = plan.phase;
    target.value.family = plan.phase === 'IDLE' ? null : this.activeFamily;
    target.value.primaryCardId = plan.primary?.id ?? null;
    target.value.supportCardId = plan.support?.id ?? null;
    target.value.reservedCredits = input.reservation.reservedCredits;
    for (const channel of plan.headwindChannels) {
      target.value.headwindChannels.push(channel);
    }
    target.value.statModifiers.healthMultiplier = Math.max(
      plan.primary?.statModifiers.healthMultiplier ?? 1,
      plan.support?.statModifiers.healthMultiplier ?? 1
    );
    target.value.statModifiers.damageMultiplier = Math.max(
      plan.primary?.statModifiers.damageMultiplier ?? 1,
      plan.support?.statModifiers.damageMultiplier ?? 1
    );
    target.value.statModifiers.speedMultiplier = Math.max(
      plan.primary?.statModifiers.speedMultiplier ?? 1,
      plan.support?.statModifiers.speedMultiplier ?? 1
    );
    target.value.statModifiers.spawnDensityMultiplier = Math.max(
      plan.primary?.statModifiers.spawnDensityMultiplier ?? 1,
      plan.support?.statModifiers.spawnDensityMultiplier ?? 1
    );
    const reasonCode = this.getReasonCode(plan.phase);
    target.reasonCodes.push(reasonCode);
    target.value.reasonCodes.push(reasonCode);
    this.activeDecisionIndex = nextIndex;
    return target;
  }

  public getSnapshot(): EncounterDecision {
    return this.getActiveDecision();
  }

  public reset(): void {
    this.planner.reset();
    this.decisions[0] = createNeutralDecision();
    this.decisions[1] = createNeutralDecision();
    this.activeDecisionIndex = 0;
    this.lastEventSourceSequence = -1;
    this.activeFamily = null;
  }

  private getActiveDecision(): MutableEncounterDecision {
    return this.activeDecisionIndex === 0 ? this.decisions[0] : this.decisions[1];
  }

  private isValid(input: EncounterManagerInput): boolean {
    return (
      Number.isFinite(input.elapsedSeconds) &&
      Number.isSafeInteger(input.seed) &&
      Number.isFinite(input.headwind) &&
      Number.isFinite(input.liquidationProximity) &&
      Number.isFinite(input.reservation.reservedCredits) &&
      input.reservation.reservedCredits >= 0
    );
  }

  private copyMarket(
    input: EncounterManagerInput,
    eventFamily: MarketEventFamily | null
  ): void {
    const source = input.market;
    const target = this.marketSnapshot;
    target.revision = source.sourceSequence;
    target.regime = source.regime;
    target.confidence = source.confidence;
    target.pressure = source.pressure;
    target.volatility = source.volatility;
    target.volume = source.volume;
    target.trend = Math.abs(source.trend);
    target.rsiExtremity = source.rsiExtremity;
    target.whalePressure = source.whalePressure;
    target.activeEventFamily = eventFamily;
    target.eventTelegraphEndsAtElapsedSeconds =
      eventFamily === null
        ? null
        : input.elapsedSeconds + DIRECTOR_CONFIG_V1.marketEvents.minTelegraphSeconds;
  }

  private copyWorld(input: EncounterManagerInput): void {
    this.worldSnapshot.activeThreat = input.world.activeEnemies;
    this.worldSnapshot.activePrimaryEncounters =
      input.world.activeEncounters > 0 ? 1 : 0;
    this.worldSnapshot.activeSupportEncounters = Math.max(
      0,
      input.world.activeEncounters - 1
    );
    this.worldSnapshot.queuedEventFamily = null;
    this.worldSnapshot.doomStacks = input.pacing.phase === 'DOOM' ? 1 : 0;
  }

  private getReasonCode(
    phase: EncounterDecisionSummary['phase']
  ): DifficultyReasonCode {
    if (phase === 'TELEGRAPH') return 'ENCOUNTER_TELEGRAPH';
    if (phase === 'ACTIVE') return 'ENCOUNTER_ACTIVE';
    if (phase === 'RECOVERY') return 'ENCOUNTER_RECOVERY';
    if (phase === 'COOLDOWN') return 'ENCOUNTER_COOLDOWN';
    return 'ENCOUNTER_IDLE';
  }

  private writeIdle(target: MutableEncounterDecision, quality: DecisionQuality): void {
    target.quality = quality;
    target.value.phase = 'IDLE';
    target.value.family = null;
    target.value.primaryCardId = null;
    target.value.supportCardId = null;
    target.value.statModifiers.healthMultiplier = 1;
    target.value.statModifiers.damageMultiplier = 1;
    target.value.statModifiers.speedMultiplier = 1;
    target.value.statModifiers.spawnDensityMultiplier = 1;
    target.value.reservedCredits = 0;
    target.reasonCodes.push('ENCOUNTER_IDLE');
    target.value.reasonCodes.push('ENCOUNTER_IDLE');
  }
}
