import { EventBus } from '../../core/EventBus';
import { type MarketInputSlice } from '../types';
import '../../market/MarketEventConsolidator';
import { type CanonicalMarketFrame } from '../../../types/marketCanonical';
import { DIFFICULTY_CONFIG } from '../constants';

/**
 * MarketInputAggregator — owns all market event subscriptions
 * and maintains the canonical market input slice.
 *
 * Responsibilities:
 * - Listens only to the ordered canonical market frame stream
 * - Keeps runtime/client/fallback source precedence outside difficulty
 * - Maintains pnlHistory ring buffer
 *
 * Hot-path safe: pre-allocated state, no allocations on update.
 */
class MarketInputAggregatorClass {
  private static instance: MarketInputAggregatorClass | null = null;

  /** Whether we have received a runtime snapshot (higher priority than client) */
  private hasRuntimeMarketAuthority = false;

  /** Pre-allocated slice — mutated in-place, never re-created in hot path */
  public readonly slice: MarketInputSlice =
    MarketInputAggregatorClass.getDefaultSlice();

  private constructor() {
    EventBus.on('canonicalMarketFrame', (data: Readonly<CanonicalMarketFrame>) => {
      this.slice.pnlPercent = data.pnlPercent;
      this.slice.currentPrice = data.price;
      this.slice.rsi = data.rsi;
      this.slice.rsiState = data.rsiState;
      this.slice.normalizedVolume = data.normalizedVolume;
      this.slice.atrPercent = data.atrPercent;
      this.slice.whaleTier = data.whaleTier;
      this.slice.macd.value = data.macd.value;
      this.slice.macd.signal = data.macd.signal;
      this.slice.macd.histogram = data.macd.histogram;
      this.slice.macd.macd = data.macd.value;
      if (data.source === 'runtime') {
        this.hasRuntimeMarketAuthority = true;
      }
      this.recordPnLMove(data.pnlPercent);
    });
  }

  static getInstance(): MarketInputAggregatorClass {
    return (MarketInputAggregatorClass.instance ??= new MarketInputAggregatorClass());
  }

  /** Record leveraged PnL to the ring buffer */
  recordPnLMove(pnl: number, leverage: number = 1): void {
    const leveragedPnL = pnl * leverage;
    this.slice.pnlHistory.push(leveragedPnL);
    if (this.slice.pnlHistory.length > DIFFICULTY_CONFIG.pnlHistorySize) {
      this.slice.pnlHistory.shift();
    }
  }

  /** Whether the runtime market feed is the authority */
  hasAuthority(): boolean {
    return this.hasRuntimeMarketAuthority;
  }

  /** Reset on game reset / disconnect */
  reset(): void {
    this.hasRuntimeMarketAuthority = false;
    const defaults = MarketInputAggregatorClass.getDefaultSlice();
    Object.assign(this.slice, defaults);
    // Reuse the existing pnlHistory array reference
    this.slice.pnlHistory.length = 0;
  }

  /** Clear per-cycle PnL history but preserve live market indicators from SSE */
  resetForCycleContinue(): void {
    this.slice.pnlHistory.length = 0;
  }

  private static getDefaultSlice(): MarketInputSlice {
    return {
      pnlPercent: 0,
      currentPrice: 0,
      rsi: 50,
      rsiState: 'NEUTRAL',
      normalizedVolume: 0,
      whaleTier: 0,
      atrPercent: 0,
      macd: { histogram: 0, signal: 0, macd: 0, value: 0 },
      pnlHistory: [],
    };
  }

  static resetForTesting(): void {
    if (this.instance) {
      this.instance.reset();
      this.instance = null;
    }
  }
}

export const MarketInputAggregator = MarketInputAggregatorClass.getInstance();
