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
import { createMACDCalculator, type MACDCalculator } from './MACDCalculator';
import { ATRCalculator } from './ATRCalculator';
import {
  createVolumeAnalyzer,
  type VolumeAnalyzer,
  type WhaleSpawnResult,
} from './VolumeAnalyzer';
import { EventBus } from '../core/EventBus';
import { Logger } from '../system/Logger';
import { AntiCheatService } from '../system/AntiCheatService';
import type { CryptoPair } from '../../types/crypto';

export class MarketIndicatorService {
  private static instance: MarketIndicatorService | null = null;

  private rsiCalculator: RSICalculator;
  private macdCalculator: MACDCalculator;
  private volumeAnalyzer: VolumeAnalyzer;
  private atrCalculator: ATRCalculator;
  private state: MarketIndicatorState;
  private activePair: CryptoPair = 'BTC';
  private lastResetTime: number = 0;

  private constructor() {
    this.rsiCalculator = createRSICalculator();
    this.macdCalculator = createMACDCalculator();
    this.volumeAnalyzer = createVolumeAnalyzer();
    this.atrCalculator = new ATRCalculator();
    this.state = getDefaultMarketIndicatorState();
    this.lastResetTime = Date.now();

    // Subscribe to game reset
    EventBus.on('gameReset', () => this.reset());

    // Sync with Server-Side Market State
    EventBus.on('marketStateUpdated', serverState => {
      // If we are getting server-side updates, use them to sync our indicators
      // This ensures client and server are always in agreement (Anti-Cheat)

      // FILTER: Only process updates for the pair currently being traded in the game session
      // serverState.pair is "BTC-USD", "ETH-USD", etc.
      const normalizedServerPair = serverState.pair.split('-')[0] as CryptoPair;
      if (normalizedServerPair !== this.activePair) {
        return;
      }

      const previousRsiState = this.state.rsiState;

      this.state = {
        ...this.state,
        rsi: serverState.rsi,
        rsiState: serverState.rsiState,
        whaleTier: serverState.whaleTier,
        atr: serverState.atr,
        atrPercent: serverState.atrPercent,
        spawnRateMultiplier: serverState.spawnRateMultiplier,
        normalizedVolume: serverState.normalizedVolume,
        lastUpdateTime: Date.now(),
        isInitialized: true,
      };

      // GRACE PERIOD: Don't emit state-change events for the first 2s after reset
      // This prevents "shocks" and "flashes" right as the game starts if market is already extreme
      const timeSinceReset = Date.now() - this.lastResetTime;
      if (timeSinceReset < 2000) {
        return;
      }

      // Emit granular events if states changed
      if (serverState.rsiState !== previousRsiState) {
        EventBus.emit('rsiStateChanged', {
          state: serverState.rsiState,
          rsi: serverState.rsi,
          pair: serverState.pair,
        });
      }

      // Re-calculate derived favorable state
      this.emitStateChangedEvent(this.state.currentPosition);

      // AUDIT: Check for indicator discrepancy (Anti-Cheat)
      const rsiDiff = Math.abs(this.state.rsi - serverState.rsi);
      if (this.rsiCalculator.isInitialized() && rsiDiff > 0.5) {
        Logger.security('RSI DISCREPANCY DETECTED', {
          server: serverState.rsi,
          client: this.state.rsi,
          diff: rsiDiff,
          pair: normalizedServerPair,
        });

        AntiCheatService.reportDiscrepancy(
          'RSI_MISMATCH',
          `Client RSI (${this.state.rsi}) significantly deviated from Server (${serverState.rsi}) by ${rsiDiff.toFixed(2)}`,
          rsiDiff > 2 ? 6 : 3
        );
      }
    });

    Logger.debug(
      '[MarketIndicatorService] Initialized and synced with MarketStateService'
    );
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
   * @param price Current price
   * @param volume Current volume
   * @param position Player's market position
   * @param pair The crypto pair being traded
   */
  update(
    price: number,
    volume: number,
    position: MarketPosition,
    pair: CryptoPair = 'BTC'
  ): MarketIndicatorState {
    return this.updateInternal(price, volume, position, pair, false);
  }

  /**
   * Warmup indicators using historical data (Silent mode)
   *
   * @param history Chronological list of past price/volume data
   * @param position Player's selected position
   */
  async warmup(
    history: Array<{ price: number; volume: number; timestamp: number }>,
    position: MarketPosition
  ): Promise<void> {
    if (history.length === 0) return;

    Logger.info(
      `[MarketIndicatorService] Warming up with ${history.length} data points...`
    );

    // Reset current state to ensure clean warmup
    this.reset();

    // Process each historical point silently
    for (const point of history) {
      this.updateInternal(point.price, point.volume, position, this.activePair, true);
    }

    Logger.info(
      `[MarketIndicatorService] Warmup complete. RSI: ${this.state.rsi}, State: ${this.state.rsiState}`
    );
  }

  /**
   * Internal common update logic
   */
  private updateInternal(
    price: number,
    volume: number,
    position: MarketPosition,
    pair: CryptoPair,
    isWarmup: boolean = false
  ): MarketIndicatorState {
    this.activePair = pair;
    const now = Date.now();

    // Snapshot current state for change detection
    const previousRsiState = this.state.rsiState;
    const previousWhaleTier = this.state.whaleTier;

    // Update RSI
    const rsi = this.rsiCalculator.update(price);
    const rsiState = this.rsiCalculator.getState();

    // Update Volume
    const normalizedVolume = this.volumeAnalyzer.update(volume);
    const whaleTier = this.volumeAnalyzer.getWhaleTier();

    // Update MACD
    const macdResult = this.macdCalculator.update(price);

    // Calculate ATR locally for perfect sync
    const { atr, atrPercent } = this.atrCalculator.update(price, price, price);

    // Calculate spawn rate multiplier from ATR
    const spawnRateMultiplier = getSpawnRateFromATR(atrPercent);

    // Calculate enemy modifier based on RSI + position
    const enemyModifier = getEnemyModifierFromRSI(rsiState, position);

    // Check whale spawn cooldown
    const canSpawnWhale =
      this.volumeAnalyzer.isInitialized() && !this.volumeAnalyzer.isOnCooldown(now);

    // Update state
    this.state = {
      normalizedVolume,
      whaleTier,
      canSpawnWhale,
      lastWhaleSpawnTime: this.state.lastWhaleSpawnTime,
      rsi,
      rsiState,
      previousRsiState,
      macd: macdResult,
      atr,
      atrPercent,
      spawnRateMultiplier,
      enemyModifier,
      isInitialized:
        this.rsiCalculator.isInitialized() ||
        this.volumeAnalyzer.isInitialized() ||
        this.atrCalculator.isInitialized() ||
        this.macdCalculator.isInitialized(),
      lastUpdateTime: now,
      currentPosition: position,
    };

    // If warmup, skip all events and side effects
    if (isWarmup) {
      return this.state;
    }

    // --- LIVE ONLY LOGIC ---

    // Log whale tier changes for debugging
    if (whaleTier !== previousWhaleTier && whaleTier !== WhaleTier.NONE) {
      Logger.info(
        `[MarketIndicatorService] Whale tier changed: ${previousWhaleTier} → ${whaleTier}`,
        {
          rawVolume: volume,
          normalizedVolume: normalizedVolume.toFixed(3),
          historyLength: this.volumeAnalyzer.getHistoryLength(),
        }
      );
    }

    // Emit event for UI/other systems (with 2s grace period to allow indicators to settle)
    const timeSinceReset = Date.now() - this.lastResetTime;
    if (timeSinceReset >= 2000) {
      this.emitStateChangedEvent(position);

      // Emit specific events if states changed after grace period
      if (rsiState !== previousRsiState) {
        EventBus.emit('rsiStateChanged', {
          state: rsiState,
          rsi,
          pair,
        });
      }
    }

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
    this.macdCalculator.reset();
    this.volumeAnalyzer.reset();
    this.atrCalculator.reset();
    this.state = getDefaultMarketIndicatorState();
    this.lastResetTime = Date.now();

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
