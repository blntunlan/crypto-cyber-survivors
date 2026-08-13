import {
  DIRECTOR_CONFIG_V1,
  type DirectorConfigV1,
} from '../../director/config/DirectorConfigV1';
import {
  type MarketEventFamily,
  type MarketRegime,
  type MarketRegimeSnapshot,
} from '../../director/contracts';
import { type CanonicalMarketFrame } from '../../../types/marketCanonical';
import { RollingAtrPercentile } from './RollingAtrPercentile';

export type RsiZone = 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT';

export type MarketRegimeState = {
  revision: number;
  regime: MarketRegime;
  rsiZone: RsiZone;
  volatilityHigh: boolean;
  volumeSurge: boolean;
  trendDirection: 'UP' | 'DOWN' | 'SIDEWAYS';
  whaleTier: 0 | 1 | 2 | 3;
};

export type MarketRegimeEvent = {
  revision: number;
  family: MarketEventFamily;
  sourceSequence: number;
};

export type MarketRegimeUpdate = {
  snapshot: MarketRegimeSnapshot;
  state: MarketRegimeState;
  event: MarketRegimeEvent | null;
};

const clampUnit = (value: number): number => Math.min(1, Math.max(0, value));

/**
 * Pure deterministic market classifier. It neither reads wall-clock time nor
 * emits gameplay side effects; callers supply canonical frame timestamps.
 */
export class MarketRegimeEngine {
  private readonly config: DirectorConfigV1;
  private regime: MarketRegime = 'CALM';
  private rsiZone: RsiZone = 'NEUTRAL';
  private volatilityHigh = false;
  private volatilityScore = 0;
  private volumeSurge = false;
  private trendDirection: 'UP' | 'DOWN' | 'SIDEWAYS' = 'SIDEWAYS';
  private lastRegimeChangedAt = 0;
  private rsiConfirmationCount = 0;
  private volatilityConfirmationCount = 0;
  private volumeConfirmationCount = 0;
  private macdConfirmationCount = 0;
  private lastEventAt: Partial<Record<MarketEventFamily, number>> = {};
  private readonly volatilityWindow: RollingAtrPercentile;
  private lastAcceptedFrame: CanonicalMarketFrame | null = null;
  private lastVolatilityPercentile = 0.5;
  private lastLivePressure = 0;
  private lastLiveElapsedSeconds = 0;

  public constructor(config: DirectorConfigV1 = DIRECTOR_CONFIG_V1) {
    this.config = config;
    this.volatilityWindow = new RollingAtrPercentile(
      config.regime.volatilityWindowSamples
    );
  }

  public update(frame: CanonicalMarketFrame, elapsedSeconds = 0): MarketRegimeUpdate {
    if (frame.quality === 'STALE') {
      return this.createStaleUpdate(frame, elapsedSeconds);
    }

    if (
      this.lastAcceptedFrame !== null &&
      frame.sourceSequence <= this.lastAcceptedFrame.sourceSequence
    ) {
      return this.createUpdate(
        this.lastAcceptedFrame,
        null,
        elapsedSeconds,
        this.lastVolatilityPercentile
      );
    }

    const volatilityPercentile = this.volatilityWindow.update(
      frame.sourceSequence,
      frame.atrPercent
    );
    const rsiEvent = this.updateRsi(frame);
    const volatilityEvent = this.updateVolatility(frame, volatilityPercentile);
    const volumeEvent = this.updateVolume(frame);
    const breakoutEvent = this.updateTrend(frame);
    const whaleEvent = this.updateWhale(frame);
    const event =
      rsiEvent ?? volatilityEvent ?? volumeEvent ?? breakoutEvent ?? whaleEvent;

    this.updateRegime(frame);
    const update = this.createUpdate(
      frame,
      event,
      elapsedSeconds,
      volatilityPercentile
    );
    this.lastAcceptedFrame = frame;
    this.lastVolatilityPercentile = volatilityPercentile;
    this.lastLivePressure = update.snapshot.pressure;
    this.lastLiveElapsedSeconds = Math.max(0, elapsedSeconds);
    return update;
  }

  public reset(): void {
    this.regime = 'CALM';
    this.rsiZone = 'NEUTRAL';
    this.volatilityHigh = false;
    this.volatilityScore = 0;
    this.volumeSurge = false;
    this.trendDirection = 'SIDEWAYS';
    this.lastRegimeChangedAt = 0;
    this.rsiConfirmationCount = 0;
    this.volatilityConfirmationCount = 0;
    this.volumeConfirmationCount = 0;
    this.macdConfirmationCount = 0;
    this.lastEventAt = {};
    this.volatilityWindow.reset();
    this.lastAcceptedFrame = null;
    this.lastVolatilityPercentile = 0.5;
    this.lastLivePressure = 0;
    this.lastLiveElapsedSeconds = 0;
  }

  private updateRsi(frame: CanonicalMarketFrame): MarketRegimeEvent | null {
    const { rsi } = this.config.regimeThresholds;

    if (this.rsiZone === 'OVERBOUGHT') {
      if (frame.rsi <= rsi.overboughtExit) this.rsiZone = 'NEUTRAL';
      return null;
    }

    if (this.rsiZone === 'OVERSOLD') {
      if (frame.rsi >= rsi.oversoldExit) this.rsiZone = 'NEUTRAL';
      return null;
    }

    const nextZone: RsiZone =
      frame.rsi >= rsi.overboughtEnter
        ? 'OVERBOUGHT'
        : frame.rsi <= rsi.oversoldEnter
          ? 'OVERSOLD'
          : 'NEUTRAL';
    this.rsiConfirmationCount =
      nextZone === 'NEUTRAL' ? 0 : this.rsiConfirmationCount + 1;

    if (this.rsiConfirmationCount < rsi.confirmationFrames) return null;

    this.rsiZone = nextZone;
    this.rsiConfirmationCount = 0;
    return this.emitIfReady('RSI_EXTREMITY', frame);
  }

  private updateVolatility(
    frame: CanonicalMarketFrame,
    volatilityPercentile: number
  ): MarketRegimeEvent | null {
    const { volatility } = this.config.regimeThresholds;
    const score = clampUnit(volatilityPercentile);
    this.volatilityScore = score;

    if (this.volatilityHigh) {
      if (score < volatility.highExit) this.volatilityHigh = false;
      return null;
    }

    this.volatilityConfirmationCount =
      score >= volatility.highEnter ? this.volatilityConfirmationCount + 1 : 0;
    if (this.volatilityConfirmationCount < volatility.confirmationFrames) return null;

    this.volatilityHigh = true;
    this.volatilityConfirmationCount = 0;
    return this.emitIfReady('VOLATILITY_SPIKE', frame);
  }

  private updateVolume(frame: CanonicalMarketFrame): MarketRegimeEvent | null {
    const { volume } = this.config.regimeThresholds;

    if (this.volumeSurge) {
      if (frame.normalizedVolume < volume.surgeExit) this.volumeSurge = false;
      return null;
    }

    this.volumeConfirmationCount =
      frame.normalizedVolume >= volume.surgeEnter
        ? this.volumeConfirmationCount + 1
        : 0;
    if (this.volumeConfirmationCount < volume.confirmationFrames) return null;

    this.volumeSurge = true;
    this.volumeConfirmationCount = 0;
    return this.emitIfReady('VOLUME_SURGE', frame);
  }

  private updateTrend(frame: CanonicalMarketFrame): MarketRegimeEvent | null {
    const isConfirmedTrend =
      frame.trendStrength >= this.config.regime.minimumTrendStrength &&
      (frame.macd.histogram > 0 || frame.macd.histogram < 0);
    this.macdConfirmationCount = isConfirmedTrend ? this.macdConfirmationCount + 1 : 0;

    if (this.macdConfirmationCount < this.config.regime.macdConfirmationFrames) {
      return null;
    }

    this.trendDirection = frame.macd.histogram > 0 ? 'UP' : 'DOWN';
    this.macdConfirmationCount = 0;
    return this.emitIfReady('BREAKOUT', frame);
  }

  private updateWhale(frame: CanonicalMarketFrame): MarketRegimeEvent | null {
    if (frame.whaleTier < this.config.regime.whaleEventMinimumTier) return null;
    return this.emitIfReady('WHALE_EVENT', frame);
  }

  private updateRegime(frame: CanonicalMarketFrame): void {
    const desiredRegime = this.getDesiredRegime(frame);
    if (desiredRegime === this.regime) return;

    const minimumDurationMs = this.config.regime.minimumDurationSeconds * 1_000;
    if (frame.sourceTimestamp - this.lastRegimeChangedAt < minimumDurationMs) return;

    this.regime = desiredRegime;
    this.lastRegimeChangedAt = frame.sourceTimestamp;
  }

  private getDesiredRegime(frame: CanonicalMarketFrame): MarketRegime {
    if (frame.whaleTier === 3) return 'PANIC';
    // Contract §21.6 separates high volatility from extreme; extreme resolves to
    // PANIC so the headwind table hands it elite synergy and vision stress
    // rather than the milder VOLATILE channels.
    if (this.volatilityScore >= this.config.regimeThresholds.volatility.extremeEnter) {
      return 'PANIC';
    }
    if (this.volatilityHigh || this.volumeSurge) return 'VOLATILE';
    if (this.trendDirection === 'UP' || this.rsiZone === 'OVERBOUGHT') {
      return 'BULL_TREND';
    }
    if (this.trendDirection === 'DOWN' || this.rsiZone === 'OVERSOLD') {
      return 'BEAR_TREND';
    }
    return 'CALM';
  }

  private emitIfReady(
    family: MarketEventFamily,
    frame: CanonicalMarketFrame
  ): MarketRegimeEvent | null {
    const cooldownSeconds =
      family === 'WHALE_EVENT'
        ? this.config.marketEvents.whaleCooldownSeconds
        : this.config.marketEvents.defaultCooldownSeconds;
    const previousAt = this.lastEventAt[family];

    if (
      previousAt !== undefined &&
      frame.sourceTimestamp - previousAt < cooldownSeconds * 1_000
    ) {
      return null;
    }

    this.lastEventAt[family] = frame.sourceTimestamp;
    return { revision: frame.revision, family, sourceSequence: frame.sourceSequence };
  }

  private createUpdate(
    frame: CanonicalMarketFrame,
    event: MarketRegimeEvent | null,
    elapsedSeconds: number,
    volatilityPercentile: number,
    pressureOverride?: number
  ): MarketRegimeUpdate {
    const volatility = clampUnit(volatilityPercentile);
    const confidence = Math.max(
      volatility,
      frame.normalizedVolume,
      frame.trendStrength,
      clampUnit(Math.abs(frame.rsi - 50) / 30),
      frame.whaleTier / 3
    );
    const pressure =
      pressureOverride === undefined
        ? clampUnit(
            volatility * this.config.marketPressure.weights.volatility +
              frame.normalizedVolume * this.config.marketPressure.weights.volume +
              frame.trendStrength * this.config.marketPressure.weights.trend +
              clampUnit(Math.abs(frame.rsi - 50) / 30) *
                this.config.marketPressure.weights.rsiExtremity +
              (frame.whaleTier / 3) * this.config.marketPressure.weights.whale
          )
        : clampUnit(pressureOverride);

    return {
      snapshot: {
        revision: frame.revision,
        regime: this.regime,
        confidence,
        pressure,
        volatility,
        volume: frame.normalizedVolume,
        trend: frame.trendStrength,
        rsiExtremity: clampUnit(Math.abs(frame.rsi - 50) / 30),
        whalePressure: frame.whaleTier / 3,
        activeEventFamily: event?.family ?? null,
        eventTelegraphEndsAtElapsedSeconds:
          event === null
            ? null
            : Math.max(0, elapsedSeconds) +
              this.config.marketEvents.minTelegraphSeconds,
      },
      state: {
        revision: frame.revision,
        regime: this.regime,
        rsiZone: this.rsiZone,
        volatilityHigh: this.volatilityHigh,
        volumeSurge: this.volumeSurge,
        trendDirection: this.trendDirection,
        whaleTier: frame.whaleTier,
      },
      event,
    };
  }

  private createStaleUpdate(
    staleFrame: CanonicalMarketFrame,
    elapsedSeconds: number
  ): MarketRegimeUpdate {
    const semanticFrame = this.lastAcceptedFrame ?? staleFrame;
    const staleAgeSeconds = Math.max(0, elapsedSeconds - this.lastLiveElapsedSeconds);
    const pressureScale = Math.max(
      0,
      1 - staleAgeSeconds / this.config.marketPressure.staleDecaySeconds
    );

    return this.createUpdate(
      semanticFrame,
      null,
      elapsedSeconds,
      this.lastVolatilityPercentile,
      this.lastLivePressure * pressureScale
    );
  }
}
