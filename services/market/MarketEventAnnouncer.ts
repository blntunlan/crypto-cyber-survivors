/**
 * MarketEventAnnouncer - Detects notable market events and emits banner announcements.
 *
 * Monitors live market data (price, RSI, volume, PnL) and fires
 * `marketAnnouncement` events via EventBus when thresholds are crossed.
 *
 * Detected events:
 * - PRICE_SHOCK_UP / PRICE_SHOCK_DOWN: +/-2% price move in 60s
 * - RSI_OVERSOLD / RSI_OVERBOUGHT: RSI state transitions
 * - LIQUIDATION_WARNING: effectivePnl < -60%
 * - FAVORABLE_MARKET: RSI aligned with player position
 *
 * Design:
 * - Called from game loop via `update()`, throttled externally (~500ms)
 * - Tracks price history in a circular buffer for shock detection
 * - Hysteresis on RSI and liquidation to avoid spam
 * - GC-friendly: pre-allocated buffer, no allocations in hot path
 *
 * @singleton
 */

import { type MarketData, type MarketPosition } from '../../types';
import { type RSIState } from '../../types/indicators';
import { EventBus } from '../core/EventBus';
import { Logger } from '../system/Logger';

// =============================================================================
// CONFIGURATION
// =============================================================================

const ANNOUNCER_CONFIG = {
  /** Price change threshold for shock detection (fraction, e.g. 0.02 = 2%) */
  PRICE_SHOCK_THRESHOLD: 0.02,
  /** Time window for price shock detection (ms) */
  PRICE_SHOCK_WINDOW_MS: 60_000,
  /** Max entries in price history buffer */
  PRICE_HISTORY_SIZE: 120,
  /** RSI threshold for oversold announcement */
  RSI_OVERSOLD_THRESHOLD: 20,
  /** RSI threshold for overbought announcement */
  RSI_OVERBOUGHT_THRESHOLD: 80,
  /** Effective PnL threshold for liquidation warning (fraction, e.g. -0.60 = -60%) */
  LIQUIDATION_PNL_THRESHOLD: -0.6,
  /** Minimum interval between same-type announcements (ms) */
  COOLDOWN_MS: 10_000,
  /** Banner display durations (ms) */
  DURATION: {
    PRICE_SHOCK: 4000,
    RSI: 3500,
    LIQUIDATION: 5000,
    FAVORABLE: 3000,
  },
} as const;

// =============================================================================
// TYPES
// =============================================================================

type AnnouncementType =
  | 'PRICE_SHOCK_UP'
  | 'PRICE_SHOCK_DOWN'
  | 'RSI_OVERSOLD'
  | 'RSI_OVERBOUGHT'
  | 'LIQUIDATION_WARNING'
  | 'FAVORABLE_MARKET';

interface PriceEntry {
  price: number;
  timestamp: number;
}

// =============================================================================
// SINGLETON
// =============================================================================

class MarketEventAnnouncerClass {
  private static instance: MarketEventAnnouncerClass | null = null;

  // Circular buffer for price history
  private readonly priceHistory: PriceEntry[];
  private priceHistoryIndex = 0;
  private priceHistoryCount = 0;

  // RSI state tracking (for transition detection)
  private lastRsiState: RSIState = 'NEUTRAL';

  // Liquidation warning state (hysteresis to avoid spam)
  private liquidationWarningActive = false;

  // Favorable market state (hysteresis)
  private favorableMarketActive = false;

  // Cooldown tracking per announcement type
  private readonly lastEmitTime: Map<AnnouncementType, number> = new Map();

  private constructor() {
    // Pre-allocate price history buffer
    this.priceHistory = new Array<PriceEntry>(ANNOUNCER_CONFIG.PRICE_HISTORY_SIZE);
    for (let i = 0; i < ANNOUNCER_CONFIG.PRICE_HISTORY_SIZE; i++) {
      this.priceHistory[i] = { price: 0, timestamp: 0 };
    }
  }

  static getInstance(): MarketEventAnnouncerClass {
    MarketEventAnnouncerClass.instance ??= new MarketEventAnnouncerClass();
    return MarketEventAnnouncerClass.instance;
  }

  static resetForTesting(): void {
    if (MarketEventAnnouncerClass.instance) {
      MarketEventAnnouncerClass.instance.reset();
      MarketEventAnnouncerClass.instance = null;
    }
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Update the announcer with latest market data.
   * Should be called from the game loop, throttled to ~500ms.
   */
  update(data: MarketData, position: MarketPosition): void {
    const now = Date.now();

    // Record price in circular buffer
    this.recordPrice(data.price, now);

    // Check each event type
    this.checkPriceShock(data, now);
    this.checkRsiTransition(data, position, now);
    // Whale detection removed — screen shake already communicates whale spawns
    this.checkLiquidationWarning(data, now);
    this.checkFavorableMarket(data, position, now);
  }

  /**
   * Reset all state for test isolation or game restart.
   */
  reset(): void {
    this.priceHistoryIndex = 0;
    this.priceHistoryCount = 0;
    for (let i = 0; i < ANNOUNCER_CONFIG.PRICE_HISTORY_SIZE; i++) {
      const entry = this.priceHistory[i];
      if (entry) {
        entry.price = 0;
        entry.timestamp = 0;
      }
    }
    this.lastRsiState = 'NEUTRAL';
    this.liquidationWarningActive = false;
    this.favorableMarketActive = false;
    this.lastEmitTime.clear();
  }

  // ===========================================================================
  // DETECTION METHODS
  // ===========================================================================

  private recordPrice(price: number, now: number): void {
    if (price <= 0) return;
    const entry = this.priceHistory[this.priceHistoryIndex];
    if (entry) {
      entry.price = price;
      entry.timestamp = now;
    }
    this.priceHistoryIndex =
      (this.priceHistoryIndex + 1) % ANNOUNCER_CONFIG.PRICE_HISTORY_SIZE;
    if (this.priceHistoryCount < ANNOUNCER_CONFIG.PRICE_HISTORY_SIZE) {
      this.priceHistoryCount++;
    }
  }

  private checkPriceShock(data: MarketData, now: number): void {
    if (this.priceHistoryCount < 2 || data.price <= 0) return;

    const windowStart = now - ANNOUNCER_CONFIG.PRICE_SHOCK_WINDOW_MS;

    // Find oldest price within the window
    let oldestPrice = 0;
    let oldestTime = Infinity;

    for (let i = 0; i < this.priceHistoryCount; i++) {
      const entry = this.priceHistory[i];
      if (
        entry &&
        entry.timestamp >= windowStart &&
        entry.timestamp < oldestTime &&
        entry.price > 0
      ) {
        oldestTime = entry.timestamp;
        oldestPrice = entry.price;
      }
    }

    if (oldestPrice <= 0) return;

    const changePercent = (data.price - oldestPrice) / oldestPrice;

    if (changePercent >= ANNOUNCER_CONFIG.PRICE_SHOCK_THRESHOLD) {
      this.emit('PRICE_SHOCK_UP', now, {
        message: `BTC +${(changePercent * 100).toFixed(1)}% in 60s`,
        color: '#00ff88',
        icon: '\u{1F4C8}',
        duration: ANNOUNCER_CONFIG.DURATION.PRICE_SHOCK,
        priority: 8,
      });
    } else if (changePercent <= -ANNOUNCER_CONFIG.PRICE_SHOCK_THRESHOLD) {
      this.emit('PRICE_SHOCK_DOWN', now, {
        message: `BTC ${(changePercent * 100).toFixed(1)}% in 60s`,
        color: '#ff4444',
        icon: '\u{1F4C9}',
        duration: ANNOUNCER_CONFIG.DURATION.PRICE_SHOCK,
        priority: 8,
      });
    }
  }

  private checkRsiTransition(
    data: MarketData,
    position: MarketPosition,
    now: number
  ): void {
    const rawRsi = data.rsiState as RSIState | undefined;
    const currentRsiState: RSIState = rawRsi ?? 'NEUTRAL';

    // Detect transitions
    if (currentRsiState !== this.lastRsiState) {
      if (currentRsiState === 'OVERSOLD' && this.lastRsiState !== 'OVERSOLD') {
        this.emit('RSI_OVERSOLD', now, {
          message: `RSI OVERSOLD (${data.rsi.toFixed(0)}) - Buyers Incoming`,
          color: '#00ffff',
          icon: '\u{1F9CA}',
          duration: ANNOUNCER_CONFIG.DURATION.RSI,
          priority: 6,
        });
      } else if (
        currentRsiState === 'OVERBOUGHT' &&
        this.lastRsiState !== 'OVERBOUGHT'
      ) {
        this.emit('RSI_OVERBOUGHT', now, {
          message: `RSI OVERBOUGHT (${data.rsi.toFixed(0)}) - Sellers Incoming`,
          color: '#ff8800',
          icon: '\u{1F525}',
          duration: ANNOUNCER_CONFIG.DURATION.RSI,
          priority: 6,
        });
      }

      // Check favorable market on RSI transition
      this.checkFavorableOnTransition(currentRsiState, position, now);

      this.lastRsiState = currentRsiState;
    }
  }

  private checkFavorableOnTransition(
    rsiState: RSIState,
    position: MarketPosition,
    now: number
  ): void {
    const isFavorable =
      (position === 'LONG' && rsiState === 'OVERSOLD') ||
      (position === 'SHORT' && rsiState === 'OVERBOUGHT');

    if (isFavorable && !this.favorableMarketActive) {
      this.favorableMarketActive = true;
      this.emit('FAVORABLE_MARKET', now, {
        message: `Market Aligned - ${position} Advantage`,
        color: '#ffd700',
        icon: '\u{2B50}',
        duration: ANNOUNCER_CONFIG.DURATION.FAVORABLE,
        priority: 5,
      });
    } else if (!isFavorable) {
      this.favorableMarketActive = false;
    }
  }

  // checkWhaleDetection removed — whale spawn is communicated via screen shake

  private checkLiquidationWarning(data: MarketData, now: number): void {
    const effectivePnlFraction = data.effectivePnl;

    if (effectivePnlFraction <= ANNOUNCER_CONFIG.LIQUIDATION_PNL_THRESHOLD) {
      if (!this.liquidationWarningActive) {
        this.liquidationWarningActive = true;
        this.emit('LIQUIDATION_WARNING', now, {
          message: `LIQUIDATION DANGER - PnL ${(data.effectivePnl * 100).toFixed(1)}%`,
          color: '#ff0000',
          icon: '\u{26A0}\u{FE0F}',
          duration: ANNOUNCER_CONFIG.DURATION.LIQUIDATION,
          priority: 10,
        });
      }
    } else if (
      effectivePnlFraction >
      ANNOUNCER_CONFIG.LIQUIDATION_PNL_THRESHOLD + 0.05
    ) {
      // Hysteresis: clear when PnL recovers above -55%
      this.liquidationWarningActive = false;
    }
  }

  private checkFavorableMarket(
    data: MarketData,
    position: MarketPosition,
    now: number
  ): void {
    // Favorable market is already checked on RSI transition.
    // This method handles the case where RSI state doesn't change
    // but the position alignment should be re-evaluated.
    // Only fire on explicit RSI transitions (handled in checkRsiTransition).
    // Intentionally a no-op to avoid duplicate announcements.
    void data;
    void position;
    void now;
  }

  // ===========================================================================
  // EMISSION
  // ===========================================================================

  private emit(
    type: AnnouncementType,
    now: number,
    payload: {
      message: string;
      color: string;
      icon: string;
      duration: number;
      priority: number;
    }
  ): void {
    const lastTime = this.lastEmitTime.get(type) ?? 0;
    if (now - lastTime < ANNOUNCER_CONFIG.COOLDOWN_MS) return;

    this.lastEmitTime.set(type, now);

    Logger.info(`[MarketEventAnnouncer] ${type}: ${payload.message}`);

    EventBus.emit('marketAnnouncement', {
      type,
      message: payload.message,
      color: payload.color,
      icon: payload.icon,
      duration: payload.duration,
      priority: payload.priority,
    });
  }
}

// =============================================================================
// EXPORT SINGLETON
// =============================================================================

export const MarketEventAnnouncer = MarketEventAnnouncerClass.getInstance();
export { MarketEventAnnouncerClass };
