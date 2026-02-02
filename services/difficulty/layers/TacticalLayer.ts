/**
 * TacticalLayer - Market-to-Gameplay Mapping
 *
 * AI Director V2 - Hierarchical Architecture
 * Layer 2: Tactical (Medium) - Updates every 1 second
 *
 * Converts market indicators into gameplay modifiers:
 * - RSI → Enemy type bias (bull/bear)
 * - ATR → Chaos level (elite spawn, speed variance)
 * - Volume → Event intensity (whale spawns, portals)
 * - Price trend → Environmental effects
 *
 * @see docs/AI_DIRECTOR_V2_DESIGN.md
 */

import { Logger } from '../../system/Logger';
import { EventBus } from '../../core/EventBus';
import type { StrategicOutput } from './StrategicLayer';

/**
 * Tactical layer configuration
 */
export const TACTICAL_CONFIG = {
  // Update interval
  UPDATE_INTERVAL_MS: 1000, // 1 second

  // RSI thresholds
  RSI_OVERSOLD: 30,
  RSI_OVERBOUGHT: 70,

  // ATR thresholds (as percentage)
  ATR_LOW: 0.3,
  ATR_HIGH: 1.5,
  ATR_EXTREME: 3.0,

  // Volume thresholds (normalized 0-1)
  VOLUME_LOW: 0.3,
  VOLUME_HIGH: 0.7,
  VOLUME_SPIKE: 0.9,

  // Enemy type bias multipliers
  ENEMY_BIAS: {
    STRONG_BEAR: { bearMultiplier: 1.5, bullMultiplier: 0.5 }, // RSI > 70
    WEAK_BEAR: { bearMultiplier: 1.2, bullMultiplier: 0.8 },
    NEUTRAL: { bearMultiplier: 1.0, bullMultiplier: 1.0 },
    WEAK_BULL: { bearMultiplier: 0.8, bullMultiplier: 1.2 },
    STRONG_BULL: { bearMultiplier: 0.5, bullMultiplier: 1.5 }, // RSI < 30
  },

  // Chaos modifiers based on ATR
  CHAOS_LEVELS: {
    CALM: { eliteChance: 0.05, speedVariance: 0.1 },
    NORMAL: { eliteChance: 0.1, speedVariance: 0.2 },
    VOLATILE: { eliteChance: 0.15, speedVariance: 0.3 },
    EXTREME: { eliteChance: 0.25, speedVariance: 0.5 },
  },

  // Whale spawn thresholds
  WHALE_VOLUME_THRESHOLD: 0.8,
  WHALE_COOLDOWN_MS: 30000, // 30 seconds

  // Portal spawn based on trend
  PORTAL_TREND_THRESHOLD: 0.02, // 2% price change
} as const;

/**
 * Market indicators input
 */
export interface MarketIndicators {
  rsi: number; // 0-100
  atrPercent: number; // ATR as percentage of price
  normalizedVolume: number; // 0-1
  priceChangePercent: number; // Recent price change
  trend: 'bullish' | 'bearish' | 'sideways';
}

/**
 * Tactical output for downstream layers
 */
export interface TacticalOutput {
  // Enemy spawning
  bearSpawnMultiplier: number;
  bullSpawnMultiplier: number;
  eliteChanceBonus: number;
  speedVariance: number;

  // Special spawns
  shouldSpawnWhale: boolean;
  whaleType: 'bull' | 'bear' | null;
  shouldSpawnPortal: boolean;
  portalType: 'profit' | 'loss' | null;

  // Environmental
  chaosLevel: 'calm' | 'normal' | 'volatile' | 'extreme';
  marketMood: 'fear' | 'neutral' | 'greed';

  // Modifiers from strategic layer
  strategicMultiplier: number;

  // Debug
  marketCondition: string;
}

/**
 * TacticalLayer - Singleton
 */
class TacticalLayerClass {
  private static instance: TacticalLayerClass | null = null;

  private lastUpdateTime: number = 0;
  private lastWhaleSpawnTime: number = 0;
  private lastPortalSpawnTime: number = 0;
  private cachedOutput: TacticalOutput | null = null;

  // Market state tracking
  private priceHistory: number[] = [];
  private readonly PRICE_HISTORY_SIZE = 60; // 1 minute at 1s intervals

  private constructor() {
    this.setupEventListeners();
    Logger.debug('[TacticalLayer] Market Mapper initialized');
  }

  static getInstance(): TacticalLayerClass {
    return (TacticalLayerClass.instance ??= new TacticalLayerClass());
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    EventBus.on('gameReset', () => this.reset());
  }

  /**
   * Update tactical layer with market data
   *
   * @param indicators - Current market indicators
   * @param strategic - Output from strategic layer
   * @returns Tactical output for reactive layer
   */
  update(indicators: MarketIndicators, strategic: StrategicOutput): TacticalOutput {
    const now = Date.now();
    const config = TACTICAL_CONFIG;

    // Check if update needed
    if (now - this.lastUpdateTime < config.UPDATE_INTERVAL_MS && this.cachedOutput) {
      return this.cachedOutput;
    }

    this.lastUpdateTime = now;

    // Record price for trend analysis
    this.recordPrice(indicators.priceChangePercent);

    // Determine enemy bias from RSI
    const enemyBias = this.calculateEnemyBias(indicators.rsi);

    // Determine chaos level from ATR
    const chaosLevel = this.calculateChaosLevel(indicators.atrPercent);
    const chaosConfig =
      config.CHAOS_LEVELS[chaosLevel.toUpperCase() as keyof typeof config.CHAOS_LEVELS];

    // Check whale spawn
    const { shouldSpawnWhale, whaleType } = this.checkWhaleSpawn(
      indicators.normalizedVolume,
      indicators.trend,
      now
    );

    // Check portal spawn
    const { shouldSpawnPortal, portalType } = this.checkPortalSpawn(
      indicators.priceChangePercent,
      now
    );

    // Determine market mood
    const marketMood = this.calculateMarketMood(indicators.rsi, indicators.atrPercent);

    // Build output
    const output: TacticalOutput = {
      bearSpawnMultiplier: enemyBias.bearMultiplier * strategic.difficultyMultiplier,
      bullSpawnMultiplier: enemyBias.bullMultiplier * strategic.difficultyMultiplier,
      eliteChanceBonus: chaosConfig.eliteChance,
      speedVariance: chaosConfig.speedVariance,

      shouldSpawnWhale,
      whaleType,
      shouldSpawnPortal,
      portalType,

      chaosLevel,
      marketMood,
      strategicMultiplier: strategic.difficultyMultiplier,

      marketCondition: this.describeMarketCondition(indicators),
    };

    this.cachedOutput = output;

    // Emit event
    EventBus.emit('tacticalLayerUpdate', {
      chaosLevel,
      marketMood,
      enemyBias:
        enemyBias.bearMultiplier > 1
          ? 'bear'
          : enemyBias.bullMultiplier > 1
            ? 'bull'
            : 'neutral',
    });

    Logger.debug(
      `[TacticalLayer] RSI=${indicators.rsi.toFixed(0)}, ` +
        `ATR=${indicators.atrPercent.toFixed(2)}%, ` +
        `Chaos=${chaosLevel}, Mood=${marketMood}`
    );

    return output;
  }

  /**
   * Calculate enemy type bias from RSI
   */
  private calculateEnemyBias(rsi: number): {
    bearMultiplier: number;
    bullMultiplier: number;
  } {
    const config = TACTICAL_CONFIG;

    if (rsi >= config.RSI_OVERBOUGHT) {
      return config.ENEMY_BIAS.STRONG_BEAR;
    } else if (rsi >= 60) {
      return config.ENEMY_BIAS.WEAK_BEAR;
    } else if (rsi <= config.RSI_OVERSOLD) {
      return config.ENEMY_BIAS.STRONG_BULL;
    } else if (rsi <= 40) {
      return config.ENEMY_BIAS.WEAK_BULL;
    }
    return config.ENEMY_BIAS.NEUTRAL;
  }

  /**
   * Calculate chaos level from ATR
   */
  private calculateChaosLevel(
    atrPercent: number
  ): 'calm' | 'normal' | 'volatile' | 'extreme' {
    const config = TACTICAL_CONFIG;

    if (atrPercent >= config.ATR_EXTREME) {
      return 'extreme';
    } else if (atrPercent >= config.ATR_HIGH) {
      return 'volatile';
    } else if (atrPercent <= config.ATR_LOW) {
      return 'calm';
    }
    return 'normal';
  }

  /**
   * Check if whale should spawn
   */
  private checkWhaleSpawn(
    volume: number,
    trend: 'bullish' | 'bearish' | 'sideways',
    now: number
  ): { shouldSpawnWhale: boolean; whaleType: 'bull' | 'bear' | null } {
    const config = TACTICAL_CONFIG;

    // Check cooldown
    if (now - this.lastWhaleSpawnTime < config.WHALE_COOLDOWN_MS) {
      return { shouldSpawnWhale: false, whaleType: null };
    }

    // Check volume threshold
    if (volume < config.WHALE_VOLUME_THRESHOLD) {
      return { shouldSpawnWhale: false, whaleType: null };
    }

    // Spawn whale based on trend
    this.lastWhaleSpawnTime = now;
    const whaleType =
      trend === 'bullish'
        ? 'bull'
        : trend === 'bearish'
          ? 'bear'
          : Math.random() > 0.5
            ? 'bull'
            : 'bear';

    return { shouldSpawnWhale: true, whaleType };
  }

  /**
   * Check if portal should spawn
   */
  private checkPortalSpawn(
    priceChangePercent: number,
    _now: number
  ): { shouldSpawnPortal: boolean; portalType: 'profit' | 'loss' | null } {
    const config = TACTICAL_CONFIG;

    const absChange = Math.abs(priceChangePercent);
    if (absChange < config.PORTAL_TREND_THRESHOLD) {
      return { shouldSpawnPortal: false, portalType: null };
    }

    // Small random chance even when threshold met
    if (Math.random() > 0.3) {
      return { shouldSpawnPortal: false, portalType: null };
    }

    const portalType = priceChangePercent > 0 ? 'profit' : 'loss';
    return { shouldSpawnPortal: true, portalType };
  }

  /**
   * Calculate market mood
   */
  private calculateMarketMood(
    rsi: number,
    atrPercent: number
  ): 'fear' | 'neutral' | 'greed' {
    // High volatility + low RSI = Fear
    // High volatility + high RSI = Greed
    // Low volatility = Neutral

    if (atrPercent < TACTICAL_CONFIG.ATR_LOW) {
      return 'neutral';
    }

    if (rsi < 40) {
      return 'fear';
    } else if (rsi > 60) {
      return 'greed';
    }
    return 'neutral';
  }

  /**
   * Record price for trend tracking
   */
  private recordPrice(change: number): void {
    this.priceHistory.push(change);
    while (this.priceHistory.length > this.PRICE_HISTORY_SIZE) {
      this.priceHistory.shift();
    }
  }

  /**
   * Describe current market condition for UI
   */
  private describeMarketCondition(indicators: MarketIndicators): string {
    const parts: string[] = [];

    // RSI description
    if (indicators.rsi >= 70) parts.push('Overbought');
    else if (indicators.rsi <= 30) parts.push('Oversold');

    // Volatility description
    if (indicators.atrPercent >= TACTICAL_CONFIG.ATR_EXTREME) {
      parts.push('Extreme Volatility');
    } else if (indicators.atrPercent >= TACTICAL_CONFIG.ATR_HIGH) {
      parts.push('High Volatility');
    }

    // Volume description
    if (indicators.normalizedVolume >= 0.9) parts.push('Volume Spike');

    // Trend description
    parts.push(indicators.trend.charAt(0).toUpperCase() + indicators.trend.slice(1));

    return parts.join(' | ') || 'Normal';
  }

  /**
   * Get current output without updating
   */
  getCurrentOutput(): TacticalOutput | null {
    return this.cachedOutput;
  }

  /**
   * Get debug state
   */
  getDebugState(): Record<string, unknown> {
    return {
      lastUpdateTime: this.lastUpdateTime,
      lastWhaleSpawnTime: this.lastWhaleSpawnTime,
      priceHistoryLength: this.priceHistory.length,
      cachedOutput: this.cachedOutput,
    };
  }

  /**
   * Reset state
   */
  reset(): void {
    this.lastUpdateTime = 0;
    this.lastWhaleSpawnTime = 0;
    this.lastPortalSpawnTime = 0;
    this.cachedOutput = null;
    this.priceHistory = [];
    Logger.debug('[TacticalLayer] Reset');
  }
}

// Export singleton
export const TacticalLayer = TacticalLayerClass.getInstance();

// For testing
export function createTacticalLayer(): TacticalLayerClass {
  (TacticalLayerClass as unknown as { instance: null }).instance = null;
  return TacticalLayerClass.getInstance();
}
