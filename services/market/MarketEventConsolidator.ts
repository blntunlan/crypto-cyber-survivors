import { EventBus } from '../core/EventBus';
import { type CanonicalMarketPayload } from '../../types/marketCanonical';
import { type MarketRuntimeSnapshot } from '../../types';

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

  /** Whether we have received a runtime snapshot (highest priority) */
  private hasRuntimeAuthority = false;

  private constructor() {
    // Priority 3 (lowest): gameMarketUpdate — basic price/pnl
    EventBus.on('gameMarketUpdate', data => {
      if (this.hasRuntimeAuthority) return;
      this.payload.price = data.price;
      this.payload.pnlPercent = data.pnl;
      this.payload.source = 'fallback';
      this.emit();
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
      this.emit();
    });

    // Priority 1 (highest): marketRuntimeSnapshot — server-side computed
    EventBus.on('marketRuntimeSnapshot', (snapshot: MarketRuntimeSnapshot) => {
      this.hasRuntimeAuthority = true;
      this.payload.price = snapshot.price;
      this.payload.pnlPercent = snapshot.rawPnl;
      this.payload.rsi = snapshot.rsi;
      this.payload.atrPercent = snapshot.atrPercent;
      if (typeof snapshot.macd === 'number') {
        this.payload.macd.value = snapshot.macd;
        this.payload.macd.signal = 0;
        this.payload.macd.histogram = snapshot.macd;
      }
      this.payload.source = 'runtime';
      this.emit();
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
  }

  private emit(): void {
    EventBus.emit('canonicalMarketUpdate', this.payload);
  }

  static resetForTesting(): void {
    if (this.instance) {
      this.instance.reset();
      this.instance = null;
    }
  }
}

export const MarketEventConsolidator = MarketEventConsolidatorClass.getInstance();
