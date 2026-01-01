/**
 * MarketIndicatorService - Market Indicators Orchestrator
 *
 * Combines all market indicators (RSI, Volume, ATR) and provides
 * a unified interface for the game systems.
 *
 * Responsibilities:
 * - Aggregates RSICalculator, VolumeAnalyzer, and ATR from PriceAnalyzerService
 * - Calculates enemy modifiers based on RSI + player position
 * - Calculates spawn rate multiplier from ATR
 * - Manages whale spawn decisions
 * - Emits marketStateChanged events for UI updates
 *
 * Integration Points:
 * - SpawnSystem: getSpawnRateMultiplier()
 * - EnemyFactory: getEnemyModifier()
 * - PoolManager: shouldSpawnWhale(), getWhaleTierConfig()
 * - GameEngine: update() on each price change
 */

import { type MarketPosition } from '../../types';
import {
  type MarketIndicatorState,
  type RSIEnemyModifier,
  getDefaultMarketIndicatorState,
  getEnemyModifierFromRSI,
  getSpawnRateFromATR,
  WhaleTier,
  WHALE_TIER_CONFIGS,
} from '../../types/indicators';
import { createRSICalculator, type RSICalculator } from './RSICalculator';
import { createVolumeAnalyzer, type VolumeAnalyzer, type WhaleSpawnResult } from './VolumeAnalyzer';
import { priceAnalyzer } from '../admin/PriceAnalyzerService';
import { EventBus } from '../EventBus';
import { Logger } from '../Logger';
import type { CryptoPair } from '../../types/crypto';

export class MarketIndicatorService {
  private static instance: MarketIndicatorService | null = null;

  private rsiCalculator: RSICalculator;
  private volumeAnalyzer: VolumeAnalyzer;
  private state: MarketIndicatorState;

  private constructor() {
    this.rsiCalculator = createRSICalculator();
    this.volumeAnalyzer = createVolumeAnalyzer();
    this.state = getDefaultMarketIndicatorState();

    // Subscribe to game reset
    EventBus.on('gameReset', () => this.reset());

    Logger.debug('[MarketIndicatorService] Initialized');
  }

  /**
   * Get singleton instance
   */
  static getInstance(): MarketIndicatorService {
    return (MarketIndicatorService.instance ??= new MarketIndicatorService());
  }

  /**
   * Update indicators with new market data
   *
   * Call this on every price update from MarketService.
   *
   * @param price Current price
   * @param volume Current volume (optional, 0 if not available)
   * @param position Player's market position (LONG/SHORT)
   * @param pair The crypto pair being traded (default: BTC)
   */
  update(
    price: number,
    volume: number,
    position: MarketPosition,
    pair: CryptoPair = 'BTC'
  ): MarketIndicatorState {
    const now = Date.now();

    // Update RSI
    const rsi = this.rsiCalculator.update(price);
    const rsiState = this.rsiCalculator.getState();
    const previousRsiState = this.state.rsiState;

    // Update Volume
    const normalizedVolume = this.volumeAnalyzer.update(volume);
    const whaleTier = this.volumeAnalyzer.getWhaleTier();

    // Log whale tier changes for debugging
    if (whaleTier !== this.state.whaleTier && whaleTier !== WhaleTier.NONE) {
      Logger.info(
        `[MarketIndicatorService] Whale tier changed: ${this.state.whaleTier} → ${whaleTier}`,
        {
          rawVolume: volume,
          normalizedVolume: normalizedVolume.toFixed(3),
          historyLength: this.volumeAnalyzer.getHistoryLength(),
        }
      );
    }

    // Get ATR from PriceAnalyzerService (already calculated for admin dashboard)
    const priceAnalysis = priceAnalyzer.getAnalysis(pair);
    const atr = priceAnalysis?.atr ?? 0;
    const currentPrice = priceAnalysis?.currentPrice ?? price;
    const atrPercent = currentPrice > 0 ? (atr / currentPrice) * 100 : 0;

    // Calculate spawn rate multiplier from ATR
    const spawnRateMultiplier = getSpawnRateFromATR(atrPercent);

    // Calculate enemy modifier based on RSI + position
    const enemyModifier = getEnemyModifierFromRSI(rsiState, position);

    // Check whale spawn cooldown
    const canSpawnWhale =
      this.volumeAnalyzer.isInitialized() && !this.volumeAnalyzer.isOnCooldown(now);

    // Update state
    this.state = {
      // Volume
      normalizedVolume,
      whaleTier,
      canSpawnWhale,
      lastWhaleSpawnTime: this.state.lastWhaleSpawnTime,

      // RSI
      rsi,
      rsiState,
      previousRsiState,

      // ATR
      atr,
      atrPercent,
      spawnRateMultiplier,

      // Enemy
      enemyModifier,

      // Meta
      isInitialized: this.rsiCalculator.isInitialized() || this.volumeAnalyzer.isInitialized(),
      lastUpdateTime: now,
      currentPosition: position,
    };

    // Emit event for UI/other systems
    this.emitStateChangedEvent(position);

    return this.state;
  }

  /**
   * Get current market indicator state
   */
  getState(): MarketIndicatorState {
    return this.state;
  }

  /**
   * Get spawn rate multiplier for SpawnSystem
   */
  getSpawnRateMultiplier(): number {
    return this.state.spawnRateMultiplier;
  }

  /**
   * Get enemy modifier for EnemyFactory
   */
  getEnemyModifier(): RSIEnemyModifier {
    return this.state.enemyModifier;
  }

  /**
   * Check if a whale should spawn (respects cooldown and tier)
   */
  shouldSpawnWhale(): WhaleSpawnResult {
    return this.volumeAnalyzer.shouldSpawnWhale();
  }

  /**
   * Get whale tier config for enemy spawning
   */
  getWhaleTierConfig(tier: WhaleTier) {
    return WHALE_TIER_CONFIGS[tier];
  }

  /**
   * Record that a whale was spawned (update cooldown)
   */
  recordWhaleSpawn(): void {
    const now = Date.now();
    this.volumeAnalyzer.recordWhaleSpawn(now);
    this.state.lastWhaleSpawnTime = now;

    // Emit whale spawned event
    EventBus.emit('whaleSpawned', {
      tier: this.state.whaleTier,
      x: 0, // Will be set by SpawnSystem
      y: 0,
      healthMultiplier: WHALE_TIER_CONFIGS[this.state.whaleTier]?.healthMultiplier ?? 1,
      sizeMultiplier: WHALE_TIER_CONFIGS[this.state.whaleTier]?.sizeMultiplier ?? 1,
    });
  }

  /**
   * Check if market state is initialized (enough data)
   */
  isInitialized(): boolean {
    return this.state.isInitialized;
  }

  /**
   * Check if current market state is favorable for player position
   */
  isFavorable(): boolean {
    const { rsiState, currentPosition } = this.state;

    if (rsiState === 'NEUTRAL') {
      return false; // Neutral is neither favorable nor unfavorable
    }

    return (
      (currentPosition === 'LONG' && rsiState === 'OVERSOLD') ||
      (currentPosition === 'SHORT' && rsiState === 'OVERBOUGHT')
    );
  }

  /**
   * Check if current market state is unfavorable for player position
   */
  isUnfavorable(): boolean {
    const { rsiState, currentPosition } = this.state;

    if (rsiState === 'NEUTRAL') {
      return false;
    }

    return (
      (currentPosition === 'LONG' && rsiState === 'OVERBOUGHT') ||
      (currentPosition === 'SHORT' && rsiState === 'OVERSOLD')
    );
  }

  /**
   * Reset all indicator state (call on game restart)
   */
  reset(): void {
    this.rsiCalculator.reset();
    this.volumeAnalyzer.reset();
    this.state = getDefaultMarketIndicatorState();

    Logger.debug('[MarketIndicatorService] Reset');
  }

  /**
   * Emit marketStateChanged event
   */
  private emitStateChangedEvent(position: MarketPosition): void {
    EventBus.emit('marketStateChanged', {
      normalizedVolume: this.state.normalizedVolume,
      rsi: this.state.rsi,
      rsiState: this.state.rsiState,
      spawnRateMultiplier: this.state.spawnRateMultiplier,
      isFavorable: this.isFavorable(),
      position,
    });
  }
}

// Export singleton instance
export const marketIndicatorService = MarketIndicatorService.getInstance();

// For testing - allows creating fresh instances
export function createMarketIndicatorService(): MarketIndicatorService {
  // Clear singleton for testing
  (MarketIndicatorService as unknown as { instance: null }).instance = null;
  return MarketIndicatorService.getInstance();
}
