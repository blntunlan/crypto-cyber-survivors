/**
 * Volume Analyzer - Market Volume Normalization & Whale Detection
 *
 * Normalizes trading volume to 0-1 range using min-max normalization
 * over a rolling window of historical data.
 *
 * Whale Tiers based on normalized volume:
 * - NONE: < 0.30 (normal trading)
 * - BABY_WHALE: 0.30 - 0.60 (elevated volume)
 * - WHALE: 0.60 - 0.90 (high volume)
 * - MEGA_WHALE: > 0.90 (extreme volume spike)
 *
 * Edge Cases Handled:
 * - Empty/insufficient history → normalized = 0.5, tier = NONE
 * - All same volume → normalized = 0.5
 * - Zero/negative volume → ignored
 * - Whale spawn cooldown → prevents spam
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

export interface WhaleSpawnResult {
  shouldSpawn: boolean;
  tier: WhaleTier;
  config: (typeof WHALE_TIER_CONFIGS)[WhaleTier] | null;
}

export class VolumeAnalyzer {
  private volumeHistory: number[] = [];
  private normalizedVolume: number = 0.5;
  private currentTier: WhaleTier = WhaleTierEnum.NONE;
  private lastWhaleSpawnTime: number = 0;
  private config: VolumeConfig;

  constructor(config: VolumeConfig = DEFAULT_VOLUME_CONFIG) {
    this.config = config;

    // Subscribe to game reset
    EventBus.on('gameReset', () => this.reset());
  }

  /**
   * Update volume analyzer with new volume data
   *
   * @param volume Current candle volume
   * @returns Normalized volume (0-1)
   */
  update(volume: number): number {
    // Validate volume
    if (!Number.isFinite(volume) || volume <= 0) {
      return this.normalizedVolume;
    }

    // Add to history
    this.volumeHistory.push(volume);

    // Limit history size
    if (this.volumeHistory.length > this.config.historySize) {
      this.volumeHistory.shift();
    }

    // Calculate normalized volume
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
   * Reset analyzer state (call on game reset)
   */
  reset(): void {
    this.volumeHistory = [];
    this.normalizedVolume = 0.5;
    this.currentTier = WhaleTierEnum.NONE;
    this.lastWhaleSpawnTime = 0;
  }

  /**
   * Calculate normalized volume using min-max normalization
   *
   * @param currentVolume The volume to normalize
   * @returns Normalized volume (0-1)
   */
  private calculateNormalizedVolume(currentVolume: number): number {
    const history = this.volumeHistory;

    // Not enough data - return middle value
    if (history.length < 2) {
      return 0.5;
    }

    // Find min and max
    let minVolume = Infinity;
    let maxVolume = -Infinity;

    for (const vol of history) {
      if (vol < minVolume) minVolume = vol;
      if (vol > maxVolume) maxVolume = vol;
    }

    // All volumes are the same - return middle value
    if (maxVolume === minVolume) {
      return 0.5;
    }

    // Min-max normalization
    const normalized = (currentVolume - minVolume) / (maxVolume - minVolume);

    // Clamp to valid range (should already be 0-1, but safety first)
    return Math.max(0, Math.min(1, normalized));
  }
}

// Export singleton instance
let instance: VolumeAnalyzer | null = null;

export function getVolumeAnalyzer(config?: VolumeConfig): VolumeAnalyzer {
  return (instance ??= new VolumeAnalyzer(config));
}

// For testing - allows creating fresh instances
export function createVolumeAnalyzer(config?: VolumeConfig): VolumeAnalyzer {
  return new VolumeAnalyzer(config);
}
