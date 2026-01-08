/**
 * Volume Analyzer with Standard Deviation Spike Detection
 *
 * Uses statistical z-score to detect meaningful volume spikes
 * that feel impactful during a 5-10 minute game session.
 *
 * Whale Events (based on σ from mean):
 * - BABY_WHALE: z-score >= 1.5 (top ~7%)   → ~2-3 per 10 min
 * - WHALE:      z-score >= 2.0 (top ~2.5%) → ~1 per 10 min
 * - MEGA_WHALE: z-score >= 2.5 (top ~0.6%) → very rare
 *
 * History: 300 data points (~5 minutes of 1s candles)
 */

export interface VolumeMetrics {
  /** Raw current volume */
  volume: number;
  /** Min-max normalized (0-1) for UI display */
  normalized: number;
  /** Percentile rank (0-1) */
  percentile: number;
  /** Z-score (how many std devs from mean) */
  zScore: number;
  /** Whale tier (0-3) based on z-score */
  whaleTier: 0 | 1 | 2 | 3;
  /** Statistical info */
  mean: number;
  stdDev: number;
  min: number;
  max: number;
}

// Z-score thresholds for whale tiers
const WHALE_Z_THRESHOLDS = {
  BABY_WHALE: 1.5, // Top ~7% - approximately 2-3 times per 10 min
  WHALE: 2.0, // Top ~2.5% - approximately once per 10 min
  MEGA_WHALE: 2.5, // Top ~0.6% - very rare, big market events
} as const;

export class VolumeAnalyzer {
  private volumes: number[] = [];
  private historySize: number;
  private lastWhaleSpawn: number = 0;
  private whaleCooldownMs: number;

  // Cache for performance
  private cachedMean: number = 0;
  private cachedStdDev: number = 0;
  private cachedSum: number = 0;
  private cachedSumSquares: number = 0;

  constructor(historySize: number = 300, whaleCooldownMs: number = 30000) {
    // 300 data points = 5 minutes of 1s candles
    // 30 second cooldown between whale spawns (prevents spam)
    this.historySize = historySize;
    this.whaleCooldownMs = whaleCooldownMs;
  }

  update(volume: number): VolumeMetrics {
    // Validate input
    if (!Number.isFinite(volume) || volume <= 0) {
      return this.getCurrentMetrics();
    }

    // Update rolling window with O(1) statistics
    this.addVolume(volume);

    return this.calculateMetrics(volume);
  }

  private addVolume(volume: number): void {
    // Remove oldest if at capacity
    if (this.volumes.length >= this.historySize) {
      const removed = this.volumes.shift()!;
      this.cachedSum -= removed;
      this.cachedSumSquares -= removed * removed;
    }

    // Add new volume
    this.volumes.push(volume);
    this.cachedSum += volume;
    this.cachedSumSquares += volume * volume;

    // Update mean and stddev
    const n = this.volumes.length;
    this.cachedMean = this.cachedSum / n;

    // Variance = E[X²] - E[X]²
    const variance = this.cachedSumSquares / n - this.cachedMean * this.cachedMean;
    this.cachedStdDev = Math.sqrt(Math.max(0, variance));
  }

  private calculateMetrics(currentVolume: number): VolumeMetrics {
    const n = this.volumes.length;

    // Not enough data yet - return neutral state
    if (n < 10) {
      return {
        volume: currentVolume,
        normalized: 0.5,
        percentile: 0.5,
        zScore: 0,
        whaleTier: 0,
        mean: currentVolume,
        stdDev: 0,
        min: currentVolume,
        max: currentVolume,
      };
    }

    const min = Math.min(...this.volumes);
    const max = Math.max(...this.volumes);

    // Min-Max Normalization (for UI display)
    let normalized = 0.5;
    if (max > min) {
      normalized = (currentVolume - min) / (max - min);
    }

    // Percentile Calculation
    const belowCount = this.volumes.filter(v => v < currentVolume).length;
    const percentile = belowCount / n;

    // Z-Score Calculation (key metric for whale detection)
    let zScore = 0;
    if (this.cachedStdDev > 0) {
      zScore = (currentVolume - this.cachedMean) / this.cachedStdDev;
    }

    // Whale Tier based on z-score
    const whaleTier = this.getWhaleTierFromZScore(zScore);

    return {
      volume: currentVolume,
      normalized,
      percentile,
      zScore,
      whaleTier,
      mean: this.cachedMean,
      stdDev: this.cachedStdDev,
      min,
      max,
    };
  }

  private getWhaleTierFromZScore(zScore: number): 0 | 1 | 2 | 3 {
    // Z-score must be positive (above mean) for whale spawn
    if (zScore >= WHALE_Z_THRESHOLDS.MEGA_WHALE) {
      return 3; // MEGA_WHALE - extreme spike
    }
    if (zScore >= WHALE_Z_THRESHOLDS.WHALE) {
      return 2; // WHALE - significant spike
    }
    if (zScore >= WHALE_Z_THRESHOLDS.BABY_WHALE) {
      return 1; // BABY_WHALE - notable spike
    }
    return 0; // NONE - normal volume
  }

  private getCurrentMetrics(): VolumeMetrics {
    if (this.volumes.length === 0) {
      return {
        volume: 0,
        normalized: 0.5,
        percentile: 0.5,
        zScore: 0,
        whaleTier: 0,
        mean: 0,
        stdDev: 0,
        min: 0,
        max: 0,
      };
    }
    const last = this.volumes[this.volumes.length - 1]!;
    return this.calculateMetrics(last);
  }

  /**
   * Check if whale can spawn (respects cooldown)
   * Prevents whale spam - minimum 30 seconds between spawns
   */
  canSpawnWhale(now: number): boolean {
    return now - this.lastWhaleSpawn >= this.whaleCooldownMs;
  }

  /**
   * Record that a whale was spawned (for cooldown tracking)
   */
  recordWhaleSpawn(now: number): void {
    this.lastWhaleSpawn = now;
  }

  /**
   * Get current z-score thresholds (for debugging/UI)
   */
  getThresholds() {
    return WHALE_Z_THRESHOLDS;
  }

  getHistoryCount(): number {
    return this.volumes.length;
  }

  getMean(): number {
    return this.cachedMean;
  }

  getStdDev(): number {
    return this.cachedStdDev;
  }

  reset(): void {
    this.volumes = [];
    this.cachedSum = 0;
    this.cachedSumSquares = 0;
    this.cachedMean = 0;
    this.cachedStdDev = 0;
    this.lastWhaleSpawn = 0;
  }
}
