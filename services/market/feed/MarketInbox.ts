import {
  type CanonicalMarketFrame,
  type MarketFrameQuality,
} from '../../../types/marketCanonical';

export type MarketInboxOptions = {
  delayedAfterMs?: number;
  staleAfterMs?: number;
};

const DEFAULT_DELAYED_AFTER_MS = 5_000;
const DEFAULT_STALE_AFTER_MS = 10_000;

const createEmptyFrame = (): CanonicalMarketFrame => ({
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
});

const copyFrame = (
  target: CanonicalMarketFrame,
  source: CanonicalMarketFrame
): void => {
  target.revision = source.revision;
  target.sequence = source.sequence;
  target.sourceSequence = source.sourceSequence;
  target.sourceTimestamp = source.sourceTimestamp;
  target.receivedAt = source.receivedAt;
  target.quality = source.quality;
  target.price = source.price;
  target.pnlPercent = source.pnlPercent;
  target.rsi = source.rsi;
  target.rsiState = source.rsiState;
  target.atrPercent = source.atrPercent;
  target.normalizedVolume = source.normalizedVolume;
  target.whaleTier = source.whaleTier;
  target.macd.value = source.macd.value;
  target.macd.signal = source.macd.signal;
  target.macd.histogram = source.macd.histogram;
  target.priceChangePercent = source.priceChangePercent;
  target.trendStrength = source.trendStrength;
  target.trendDirection = source.trendDirection;
  target.source = source.source;
};

/**
 * Bounded, allocation-free handoff between market callbacks and simulation ticks.
 * Frames offered after a tick has started are held for the following tick.
 */
export class MarketInbox {
  private readonly delayedAfterMs: number;
  private readonly staleAfterMs: number;
  private readonly latestFrame = createEmptyFrame();
  private readonly lockedFrame = createEmptyFrame();
  private hasLatestFrame = false;
  private lastAcceptedSequence = -1;
  private lockedTick: number | null = null;

  public constructor(options: MarketInboxOptions = {}) {
    this.delayedAfterMs = options.delayedAfterMs ?? DEFAULT_DELAYED_AFTER_MS;
    this.staleAfterMs = options.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;

    if (this.delayedAfterMs <= 0 || this.staleAfterMs <= this.delayedAfterMs) {
      throw new Error('MarketInbox requires positive ordered quality thresholds');
    }
  }

  public offer(frame: CanonicalMarketFrame): boolean {
    if (frame.sequence <= this.lastAcceptedSequence) return false;

    copyFrame(this.latestFrame, frame);
    this.latestFrame.quality = this.getQuality(
      frame.receivedAt - frame.sourceTimestamp
    );
    this.lastAcceptedSequence = frame.sequence;
    this.hasLatestFrame = true;
    return true;
  }

  public lockForSimulationTick(
    simulationTick: number,
    nowMs: number
  ): Readonly<CanonicalMarketFrame> | null {
    if (
      this.lockedTick === simulationTick ||
      (this.lockedTick !== null && simulationTick < this.lockedTick)
    ) {
      return this.hasLatestFrame ? this.lockedFrame : null;
    }

    this.refreshQuality(nowMs);
    this.lockedTick = simulationTick;
    if (!this.hasLatestFrame) return null;

    copyFrame(this.lockedFrame, this.latestFrame);
    return this.lockedFrame;
  }

  public getLatestFrame(): Readonly<CanonicalMarketFrame> | null {
    return this.hasLatestFrame ? this.latestFrame : null;
  }

  public getLockedFrame(): Readonly<CanonicalMarketFrame> | null {
    return this.lockedTick === null || !this.hasLatestFrame ? null : this.lockedFrame;
  }

  public refreshQuality(nowMs: number): boolean {
    if (!this.hasLatestFrame) return false;

    const nextQuality = this.getQuality(nowMs - this.latestFrame.receivedAt);
    if (nextQuality === this.latestFrame.quality) return false;

    this.latestFrame.quality = nextQuality;
    return true;
  }

  public reset(): void {
    this.hasLatestFrame = false;
    this.lastAcceptedSequence = -1;
    this.lockedTick = null;
    copyFrame(this.latestFrame, createEmptyFrame());
    copyFrame(this.lockedFrame, createEmptyFrame());
  }

  private getQuality(ageMs: number): MarketFrameQuality {
    if (ageMs > this.staleAfterMs) return 'STALE';
    if (ageMs > this.delayedAfterMs) return 'DELAYED';
    return 'LIVE';
  }
}
