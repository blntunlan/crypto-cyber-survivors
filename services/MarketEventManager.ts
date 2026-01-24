import { EventBus } from './EventBus';
import { Logger } from './Logger';
import { type MarketState } from './MarketStateService';

/**
 * GameMarketEvent - Custom events triggered by market conditions
 */
export type GameMarketEvent =
  | 'VOLUME_SPIKE' // Flash Mob
  | 'PRICE_BREAKOUT' // Trend Reversal
  | 'WHALE_ALERT' // Boss Wave
  | 'CONSOLIDATION' // Calm Before Storm
  | 'FLASH_CRASH'; // Panic Mode

export interface MarketEventPayload {
  type: GameMarketEvent;
  intensity: number; // 0.0 to 1.0
  durationMs: number;
}

/**
 * MarketEventManager - Translates raw market data into gameplay events (Micro-Events)
 *
 * Implements Layer 1: Market-Driven Event System
 */
class MarketEventManagerClass {
  private static instance: MarketEventManagerClass | null = null;
  private lastPrice: number = 0;
  private lastWhaleTier: number = 0;
  private eventCooldowns: Map<GameMarketEvent, number> = new Map();

  private constructor() {
    EventBus.on('marketStateUpdated', (state: MarketState) => this.analyze(state));
    EventBus.on('gameReset', () => this.reset());
  }

  private reset(): void {
    this.lastPrice = 0;
    this.lastWhaleTier = 0;
    this.eventCooldowns.clear();
    Logger.info('[MarketEventManager] State reset');
  }

  public static getInstance(): MarketEventManagerClass {
    return (MarketEventManagerClass.instance ??= new MarketEventManagerClass());
  }

  private analyze(state: MarketState): void {
    const now = Date.now();

    // 1. VOLUME SPIKE -> "Flash Mob"
    // Use volumePercentile > 0.9 (Top 10%)
    if (state.volumePercentile > 0.9 && this.canFire('VOLUME_SPIKE', now)) {
      this.emit('VOLUME_SPIKE', state.volumePercentile, 20000);
    }

    // 2. WHALE ALERT -> "Boss Wave"
    if (
      state.whaleTier > this.lastWhaleTier &&
      state.whaleTier >= 2 &&
      this.canFire('WHALE_ALERT', now)
    ) {
      this.emit('WHALE_ALERT', state.whaleTier / 3, 30000);
    }
    this.lastWhaleTier = state.whaleTier;

    // 3. FLASH CRASH -> "Panic Mode"
    // Rapid price drop check
    if (this.lastPrice > 0) {
      const drop = (this.lastPrice - state.price) / this.lastPrice;
      if (drop > 0.005 && this.canFire('FLASH_CRASH', now)) {
        // 0.5% drop in one update is local crash
        this.emit('FLASH_CRASH', Math.min(1.0, drop * 50), 15000);
      }
    }
    this.lastPrice = state.price;

    // 4. RSI Extremes -> "Momentum Shift"
    if (state.rsiState !== 'NEUTRAL' && this.canFire('PRICE_BREAKOUT', now)) {
      this.emit('PRICE_BREAKOUT', 0.8, 25000);
    }

    // 5. CONSOLIDATION -> "Calm Before Storm"
    // Low ATR and neutral RSI
    if (
      state.atrPercent < 0.002 &&
      state.rsiState === 'NEUTRAL' &&
      this.canFire('CONSOLIDATION', now)
    ) {
      this.emit('CONSOLIDATION', 0.5, 30000);
    }
  }

  private canFire(type: GameMarketEvent, now: number): boolean {
    const cooldown = this.eventCooldowns.get(type) ?? 0;
    if (now > cooldown) {
      // Set cooldown (e.g., 60s for most events to avoid spam)
      this.eventCooldowns.set(type, now + 60000);
      return true;
    }
    return false;
  }

  private emit(type: GameMarketEvent, intensity: number, durationMs: number): void {
    Logger.info(`[MarketEventManager] Firing Event: ${type}`, {
      intensity,
      durationMs,
    });
    EventBus.emit('gameMarketEvent', { type, intensity, durationMs });
  }
}

export const MarketEventManager = MarketEventManagerClass.getInstance();
