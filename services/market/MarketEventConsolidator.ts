import { EventBus } from '../core/EventBus';
import {
  type CanonicalMarketFrame,
  type CanonicalMarketPayload,
} from '../../types/marketCanonical';
import { type MarketRuntimeSnapshot } from '../../types';
import { MarketInbox } from './feed/MarketInbox';

/**
 * MarketEventConsolidator — Mediator pattern
 *
 * Subscribes to 3 overlapping market events, applies source priority
 * (runtime > client > fallback), and emits a single `canonicalMarketUpdate`.
 *
 * Hot-path safe: pre-allocated output object, no heap allocations.
 */
class MarketEventConsolidatorClass {
  private static instance: MarketEventConsolidatorClass | null = null;

  /** Pre-allocated canonical payload — mutated in-place (GC-free) */
  private readonly payload: CanonicalMarketPayload = {
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
  };

  /** Pre-allocated ordered frame handed to the simulation boundary. */
  private readonly frame: CanonicalMarketFrame = {
    revision: 0,
    sequence: 0,
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
  };

  private readonly inbox = new MarketInbox();
  private nextSequence = 0;

  /** Whether we have received a runtime snapshot (highest priority) */
  private hasRuntimeAuthority = false;

  private constructor() {
    // Priority 3 (lowest): gameMarketUpdate — basic price/pnl
    EventBus.on('gameMarketUpdate', data => {
      if (this.hasRuntimeAuthority) return;
      this.payload.price = data.price;
      this.payload.pnlPercent = data.pnl;
      this.payload.source = 'fallback';
      this.publish(Date.now());
    });

    // Priority 2: clientIndicatorsUpdated — full indicator set from client
    EventBus.on('clientIndicatorsUpdated', data => {
      if (this.hasRuntimeAuthority) return;
      this.payload.rsi = data.rsi;
      this.payload.rsiState = data.rsiState;
      this.payload.atrPercent = data.atrPercent;
      this.payload.normalizedVolume = data.normalizedVolume;
      this.payload.whaleTier = data.whaleTier;
      this.payload.priceChangePercent = data.priceChangePercent;
      this.payload.trendStrength = data.trendStrength;
      this.payload.trendDirection = data.trendDirection;
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (data.macd) {
        this.payload.macd.value = data.macd.value;
        this.payload.macd.signal = data.macd.signal;
        this.payload.macd.histogram = data.macd.histogram;
      }
      this.payload.source = 'client';
      this.publish(Date.now());
    });

    // Priority 1 (highest): marketRuntimeSnapshot — server-side computed
    EventBus.on('marketRuntimeSnapshot', (snapshot: MarketRuntimeSnapshot) => {
      this.hasRuntimeAuthority = true;
      this.payload.price = snapshot.price;
      this.payload.pnlPercent = snapshot.rawPnl;
      this.payload.rsi = snapshot.rsi;
      this.payload.rsiState = snapshot.rsiState;
      this.payload.atrPercent = snapshot.atrPercent;
      this.payload.normalizedVolume = snapshot.normalizedVolume;
      this.payload.whaleTier = snapshot.whaleTier;
      if (typeof snapshot.macd === 'number') {
        this.payload.macd.value = snapshot.macd;
        this.payload.macd.signal = 0;
        this.payload.macd.histogram = snapshot.macd;
      }
      this.payload.source = 'runtime';
      this.publish(snapshot.createdAt);
    });

    EventBus.on('gameReset', () => this.reset());
  }

  static getInstance(): MarketEventConsolidatorClass {
    return (MarketEventConsolidatorClass.instance ??=
      new MarketEventConsolidatorClass());
  }

  /** Get the latest canonical payload (read-only reference) */
  getLatest(): Readonly<CanonicalMarketPayload> {
    return this.payload;
  }

  /** Returns the latest accepted frame; callers must not retain it past a tick. */
  getLatestFrame(): Readonly<CanonicalMarketFrame> | null {
    return this.inbox.getLatestFrame();
  }

  /** Locks one immutable market revision for the current simulation tick. */
  lockForSimulationTick(
    simulationTick: number,
    nowMs: number
  ): Readonly<CanonicalMarketFrame> | null {
    return this.inbox.lockForSimulationTick(simulationTick, nowMs);
  }

  /** Whether the runtime feed has authority */
  hasAuthority(): boolean {
    return this.hasRuntimeAuthority;
  }

  reset(): void {
    this.hasRuntimeAuthority = false;
    this.payload.price = 0;
    this.payload.pnlPercent = 0;
    this.payload.rsi = 50;
    this.payload.rsiState = 'NEUTRAL';
    this.payload.atrPercent = 0;
    this.payload.normalizedVolume = 0;
    this.payload.whaleTier = 0;
    this.payload.macd.value = 0;
    this.payload.macd.signal = 0;
    this.payload.macd.histogram = 0;
    this.payload.priceChangePercent = 0;
    this.payload.trendStrength = 0;
    this.payload.trendDirection = 'SIDEWAYS';
    this.payload.source = 'fallback';
    this.nextSequence = 0;
    this.inbox.reset();
  }

  private publish(sourceTimestamp: number): void {
    const receivedAt = Date.now();
    this.nextSequence += 1;
    this.frame.revision = this.nextSequence;
    this.frame.sequence = this.nextSequence;
    this.frame.sourceTimestamp = sourceTimestamp;
    this.frame.receivedAt = receivedAt;
    this.frame.price = this.payload.price;
    this.frame.pnlPercent = this.payload.pnlPercent;
    this.frame.rsi = this.payload.rsi;
    this.frame.rsiState = this.payload.rsiState;
    this.frame.atrPercent = this.payload.atrPercent;
    this.frame.normalizedVolume = this.payload.normalizedVolume;
    this.frame.whaleTier = this.payload.whaleTier;
    this.frame.macd.value = this.payload.macd.value;
    this.frame.macd.signal = this.payload.macd.signal;
    this.frame.macd.histogram = this.payload.macd.histogram;
    this.frame.priceChangePercent = this.payload.priceChangePercent;
    this.frame.trendStrength = this.payload.trendStrength;
    this.frame.trendDirection = this.payload.trendDirection;
    this.frame.source = this.payload.source;
    this.inbox.offer(this.frame);

    EventBus.emit('canonicalMarketUpdate', this.payload);
    const latestFrame = this.inbox.getLatestFrame();
    if (latestFrame) {
      EventBus.emit('canonicalMarketFrame', latestFrame);
    }
  }

  static resetForTesting(): void {
    if (this.instance) {
      this.instance.reset();
      this.instance = null;
    }
  }
}

export const MarketEventConsolidator = MarketEventConsolidatorClass.getInstance();
