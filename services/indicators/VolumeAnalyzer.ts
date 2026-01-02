/**
 * Volume Analyzer - Market Volume Normalization & Whale Detection
 *
 * Normalizes trading volume to 0-1 range using z-score normalization
 * over a rolling window of historical data. Z-score is more robust
 * to outliers than min-max normalization.
 *
 * Whale Tiers based on z-score:
 * - NONE: z < 1.0σ (normal trading)
 * - BABY_WHALE: 1.0σ - 1.5σ (elevated volume)
 * - WHALE: 1.5σ - 2.0σ (high volume)
 * - MEGA_WHALE: > 2.0σ (extreme volume spike)
 *
 * Edge Cases Handled:
 * - Empty/insufficient history → normalized = 0.5, tier = NONE
 * - All same volume → normalized = 0.5 (std = 0)
 * - Zero/negative/NaN volume → ignored
 * - Whale spawn cooldown → prevents spam
 * - EventBus listener cleanup on dispose
 */

import {
  type VolumeConfig,
  type WhaleTier,
  DEFAULT_VOLUME_CONFIG,
  WHALE_TIER_CONFIGS,
  getWhaleTierFromVolume,
} from '../../types/indicators';
import { WhaleTier as WhaleTierEnum } from '../../types/indicators';
import { EventBus } from '../EventBus';
import { Logger } from '../Logger';

export interface WhaleSpawnResult {
  shouldSpawn: boolean;
  tier: WhaleTier;
  config: (typeof WHALE_TIER_CONFIGS)[WhaleTier] | null;
}

/**
 * Rolling statistics for efficient O(1) mean and std calculation.
 * Uses Welford's online algorithm for numerical stability.
 */
interface RollingStats {
  count: number;
  mean: number;
  m2: number; // Sum of squares of differences from the mean
}

export class VolumeAnalyzer {
  private volumeHistory: number[] = [];
  private normalizedVolume: number = 0.5;
  private currentTier: WhaleTier = WhaleTierEnum.NONE;
  private lastWhaleSpawnTime: number = 0;
  private config: VolumeConfig;

  // Rolling statistics for efficient updates
  private stats: RollingStats = { count: 0, mean: 0, m2: 0 };

  // EventBus listener reference for cleanup
  private gameResetHandler: (() => void) | null = null;
  private isDisposed: boolean = false;

  constructor(config: VolumeConfig = DEFAULT_VOLUME_CONFIG) {
    this.config = { ...config }; // Defensive copy

    // Subscribe to game reset with stored reference for cleanup
    this.gameResetHandler = () => this.reset();
    EventBus.on('gameReset', this.gameResetHandler);
  }

  /**
   * Update volume analyzer with new volume data.
   * Uses rolling statistics for O(1) normalization.
   *
   * @param volume Current candle volume
   * @returns Normalized volume (0-1)
   */
  update(volume: number): number {
    if (this.isDisposed) {
      Logger.warn('[VolumeAnalyzer] Attempted update on disposed instance');
      return this.normalizedVolume;
    }

    // Validate volume - must be positive finite number
    if (!Number.isFinite(volume) || volume <= 0) {
      return this.normalizedVolume;
    }

    // Handle history size limit with FIFO
    if (this.volumeHistory.length >= this.config.historySize) {
      const removed = this.volumeHistory.shift()!;
      this.removeFromStats(removed);
    }

    // Add new volume to history and stats
    this.volumeHistory.push(volume);
    this.addToStats(volume);

    // Calculate normalized volume using z-score
    this.normalizedVolume = this.calculateNormalizedVolume(volume);

    // Update whale tier
    this.currentTier = getWhaleTierFromVolume(this.normalizedVolume);

    return this.normalizedVolume;
  }

  /**
   * Get current normalized volume (0-1)
   */
  getNormalizedVolume(): number {
    return this.normalizedVolume;
  }

  /**
   * Get current whale tier
   */
  getWhaleTier(): WhaleTier {
    return this.currentTier;
  }

  /**
   * Check if a whale should spawn (respects cooldown)
   *
   * @param currentTime Current timestamp in ms (defaults to Date.now())
   * @returns Spawn decision with tier and config
   */
  shouldSpawnWhale(currentTime: number = Date.now()): WhaleSpawnResult {
    const noSpawn: WhaleSpawnResult = {
      shouldSpawn: false,
      tier: WhaleTierEnum.NONE,
      config: null,
    };

    // No whale tier active
    if (this.currentTier === WhaleTierEnum.NONE) {
      return noSpawn;
    }

    // Not enough history for reliable whale spawning
    if (this.volumeHistory.length < this.config.minHistoryForWhale) {
      return noSpawn;
    }

    // Cooldown check
    const timeSinceLastSpawn = currentTime - this.lastWhaleSpawnTime;
    if (timeSinceLastSpawn < this.config.minWhaleInterval) {
      return noSpawn;
    }

    // Get whale config
    const config = WHALE_TIER_CONFIGS[this.currentTier];
    if (!config) {
      return noSpawn;
    }

    // Roll for spawn chance
    if (Math.random() > config.spawnChance) {
      return noSpawn;
    }

    // Successful spawn - update cooldown
    this.lastWhaleSpawnTime = currentTime;

    return {
      shouldSpawn: true,
      tier: this.currentTier,
      config,
    };
  }

  /**
   * Manually mark a whale as spawned (to update cooldown)
   */
  recordWhaleSpawn(currentTime: number = Date.now()): void {
    this.lastWhaleSpawnTime = currentTime;
  }

  /**
   * Check if the system has enough data for accurate whale detection
   */
  isInitialized(): boolean {
    return this.volumeHistory.length >= this.config.minHistoryForWhale;
  }

  /**
   * Get the number of volume data points in history
   */
  getHistoryLength(): number {
    return this.volumeHistory.length;
  }

  /**
   * Get time remaining on whale spawn cooldown (ms)
   */
  getCooldownRemaining(currentTime: number = Date.now()): number {
    const timeSinceLastSpawn = currentTime - this.lastWhaleSpawnTime;
    const remaining = this.config.minWhaleInterval - timeSinceLastSpawn;
    return Math.max(0, remaining);
  }

  /**
   * Check if whale spawn is on cooldown
   */
  isOnCooldown(currentTime: number = Date.now()): boolean {
    return this.getCooldownRemaining(currentTime) > 0;
  }

  /**
   * Get current rolling statistics (for debugging)
   */
  getStats(): { mean: number; stdDev: number; count: number } {
    return {
      mean: this.stats.mean,
      stdDev: this.getStdDev(),
      count: this.stats.count,
    };
  }

  /**
   * Reset analyzer state (call on game reset)
   */
  reset(): void {
    this.volumeHistory = [];
    this.normalizedVolume = 0.5;
    this.currentTier = WhaleTierEnum.NONE;
    this.lastWhaleSpawnTime = 0;
    this.stats = { count: 0, mean: 0, m2: 0 };
  }

  /**
   * Dispose of the analyzer and clean up resources.
   * Should be called when the instance is no longer needed.
   */
  dispose(): void {
    if (this.isDisposed) return;

    if (this.gameResetHandler) {
      EventBus.unsubscribe('gameReset', this.gameResetHandler);
      this.gameResetHandler = null;
    }

    this.reset();
    this.isDisposed = true;
  }

  /**
   * Add a value to rolling statistics using Welford's algorithm.
   * Numerically stable for large datasets.
   */
  private addToStats(value: number): void {
    this.stats.count++;
    const delta = value - this.stats.mean;
    this.stats.mean += delta / this.stats.count;
    const delta2 = value - this.stats.mean;
    this.stats.m2 += delta * delta2;
  }

  /**
   * Remove a value from rolling statistics.
   * Note: This is an approximation that works well for large windows.
   */
  private removeFromStats(value: number): void {
    if (this.stats.count <= 1) {
      this.stats = { count: 0, mean: 0, m2: 0 };
      return;
    }

    const delta = value - this.stats.mean;
    this.stats.mean = (this.stats.mean * this.stats.count - value) / (this.stats.count - 1);
    const delta2 = value - this.stats.mean;
    this.stats.m2 -= delta * delta2;
    this.stats.count--;

    // Ensure m2 doesn't go negative due to floating point errors
    if (this.stats.m2 < 0) this.stats.m2 = 0;
  }

  /**
   * Get standard deviation from rolling stats
   */
  private getStdDev(): number {
    if (this.stats.count < 2) return 0;
    return Math.sqrt(this.stats.m2 / this.stats.count);
  }

  /**
   * Calculate normalized volume using z-score normalization.
   * Z-score is converted to 0-1 range using sigmoid function.
   *
   * @param currentVolume The volume to normalize
   * @returns Normalized volume (0-1)
   */
  private calculateNormalizedVolume(currentVolume: number): number {
    // Not enough data - return middle value
    if (this.stats.count < 2) {
      return 0.5;
    }

    const stdDev = this.getStdDev();

    // All volumes are the same (std = 0) - return middle value
    if (stdDev === 0) {
      return 0.5;
    }

    // Calculate z-score
    const zScore = (currentVolume - this.stats.mean) / stdDev;

    // Convert z-score to 0-1 using sigmoid-like mapping
    // z = 0 → 0.5, z = 2 → ~0.88, z = -2 → ~0.12
    // This maps approximately 3 standard deviations to [0.05, 0.95]
    const normalized = 1 / (1 + Math.exp(-zScore * 0.75));

    // Clamp to valid range
    return Math.max(0, Math.min(1, normalized));
  }
}

// Export singleton instance with lazy initialization
let instance: VolumeAnalyzer | null = null;

/**
 * Get the singleton VolumeAnalyzer instance.
 * Note: Config is only used on first call. Subsequent calls return existing instance.
 */
export function getVolumeAnalyzer(config?: VolumeConfig): VolumeAnalyzer {
  if (!instance) {
    instance = new VolumeAnalyzer(config);
  }
  return instance;
}

/**
 * Reset the singleton instance (for testing or full reset)
 */
export function resetVolumeAnalyzerInstance(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}

// For testing - allows creating fresh instances
export function createVolumeAnalyzer(config?: VolumeConfig): VolumeAnalyzer {
  return new VolumeAnalyzer(config);
}
