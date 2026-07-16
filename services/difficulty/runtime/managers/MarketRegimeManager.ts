import { DIFFICULTY_RUNTIME_CONFIG } from '../../../../config/difficulty/DifficultyRuntimeConfig';
import { MarketRegimeEngine } from '../../../market/regime/MarketRegimeEngine';
import { type MarketRegimeDecision, type MarketRegimeManagerInput } from '../contracts';
import {
  type DecisionQuality,
  type DifficultyReasonCode,
  type MarketDecisionSummary,
} from '../../../../types/runtimeDifficulty';

type MutableMarketDecision = {
  revision: number;
  validFromTick: number;
  inputRevision: number;
  quality: DecisionQuality;
  value: Omit<MarketDecisionSummary, 'reasonCodes'> & {
    reasonCodes: DifficultyReasonCode[];
  };
  reasonCodes: DifficultyReasonCode[];
  clampCodes: [];
};

const createNeutralDecision = (): MutableMarketDecision => ({
  revision: 0,
  validFromTick: 0,
  inputRevision: 0,
  quality: 'NEUTRAL',
  value: {
    sourceSequence: 0,
    quality: 'NEUTRAL',
    regime: 'CALM',
    confidence: 0,
    pressure: 0,
    volatility: 0,
    volume: 0,
    trend: 0,
    rsiExtremity: 0,
    whalePressure: 0,
    activeEventFamily: null,
    reasonCodes: ['NEUTRAL_INPUT'],
  },
  reasonCodes: ['NEUTRAL_INPUT'],
  clampCodes: [],
});

const clampUnit = (value: number): number => Math.min(1, Math.max(0, value));

export class MarketRegimeManager {
  private readonly decisions: [MutableMarketDecision, MutableMarketDecision] = [
    createNeutralDecision(),
    createNeutralDecision(),
  ];
  private readonly engine = new MarketRegimeEngine();
  private activeDecisionIndex = 0;

  public update(input: MarketRegimeManagerInput): MarketRegimeDecision {
    const current =
      this.activeDecisionIndex === 0 ? this.decisions[0] : this.decisions[1];
    const nextIndex = this.activeDecisionIndex === 0 ? 1 : 0;
    const target = nextIndex === 0 ? this.decisions[0] : this.decisions[1];
    const frame = input.frame;

    target.revision = current.revision + 1;
    target.validFromTick = input.validFromTick;
    target.inputRevision = input.inputRevision;
    target.reasonCodes.length = 0;
    target.value.reasonCodes.length = 0;

    if (frame === null || !Number.isFinite(input.elapsedSeconds)) {
      this.writeNeutral(target, 'NEUTRAL_INPUT');
      this.activeDecisionIndex = nextIndex;
      return target;
    }

    const update = this.engine.update(frame, input.elapsedSeconds);
    const quality: DecisionQuality = frame.quality === 'LIVE' ? 'LIVE' : 'DEGRADED';
    const reasonCode: DifficultyReasonCode =
      frame.quality === 'LIVE'
        ? 'MARKET_LIVE'
        : frame.quality === 'DELAYED'
          ? 'MARKET_DELAYED'
          : 'MARKET_STALE';
    const pressure =
      frame.quality === 'STALE'
        ? 0
        : frame.quality === 'DELAYED'
          ? Math.min(update.snapshot.pressure, current.value.pressure)
          : update.snapshot.pressure;

    target.quality = quality;
    target.value.sourceSequence = frame.sourceSequence;
    target.value.quality = quality;
    target.value.regime = update.snapshot.regime;
    target.value.confidence = clampUnit(update.snapshot.confidence);
    target.value.pressure = clampUnit(pressure);
    target.value.volatility = clampUnit(update.snapshot.volatility);
    target.value.volume = clampUnit(update.snapshot.volume);
    target.value.trend =
      frame.trendDirection === 'DOWN'
        ? -clampUnit(update.snapshot.trend)
        : frame.trendDirection === 'UP'
          ? clampUnit(update.snapshot.trend)
          : 0;
    target.value.rsiExtremity = clampUnit(update.snapshot.rsiExtremity);
    target.value.whalePressure = clampUnit(update.snapshot.whalePressure);
    target.value.activeEventFamily =
      frame.quality === 'LIVE' ? update.snapshot.activeEventFamily : null;
    target.reasonCodes.push(reasonCode);
    target.value.reasonCodes.push(reasonCode);
    this.activeDecisionIndex = nextIndex;
    return target;
  }

  public getSnapshot(): MarketRegimeDecision {
    return this.activeDecisionIndex === 0 ? this.decisions[0] : this.decisions[1];
  }

  public reset(): void {
    this.engine.reset();
    this.decisions[0] = createNeutralDecision();
    this.decisions[1] = createNeutralDecision();
    this.activeDecisionIndex = 0;
  }

  private writeNeutral(
    target: MutableMarketDecision,
    reasonCode: DifficultyReasonCode
  ): void {
    target.quality = 'NEUTRAL';
    target.value.sourceSequence = 0;
    target.value.quality = 'NEUTRAL';
    target.value.regime = DIFFICULTY_RUNTIME_CONFIG.neutral.marketRegime;
    target.value.confidence = 0;
    target.value.pressure = 0;
    target.value.volatility = 0;
    target.value.volume = 0;
    target.value.trend = 0;
    target.value.rsiExtremity = 0;
    target.value.whalePressure = 0;
    target.value.activeEventFamily = null;
    target.reasonCodes.push(reasonCode);
    target.value.reasonCodes.push(reasonCode);
  }
}
