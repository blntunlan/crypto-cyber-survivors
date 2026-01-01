/**
 * Volume Analyzer with Percentile Normalization
 *
 * History: 100 candles
 * Whale Cooldown: 5 seconds
 */
export class VolumeAnalyzer {
  private volumes: number[] = [];
  private historySize: number;
  private lastWhaleSpawn: number = 0;
  private whaleCooldownMs: number;

  constructor(historySize: number = 100, whaleCooldownMs: number = 5000) {
    this.historySize = historySize;
    this.whaleCooldownMs = whaleCooldownMs;
  }

  update(volume: number): {
    normalized: number;
    percentile: number;
    whaleTier: number;
    min: number;
    max: number;
  } {
    // Validate
    if (!Number.isFinite(volume) || volume <= 0) {
      return this.getCurrentState();
    }

    // Add to history
    this.volumes.push(volume);
    if (this.volumes.length > this.historySize) {
      this.volumes.shift();
    }

    return this.calculateMetrics(volume);
  }

  private calculateMetrics(currentVolume: number) {
    const min = Math.min(...this.volumes);
    const max = Math.max(...this.volumes);

    // Min-Max Normalization
    let normalized = 0.5;
    if (max > min) {
      normalized = (currentVolume - min) / (max - min);
    }

    // Percentile Calculation
    const sorted = [...this.volumes].sort((a, b) => a - b);
    const rank = sorted.filter(v => v < currentVolume).length;
    const percentile = rank / sorted.length;

    // Whale Tier (percentile-based)
    const whaleTier = this.getWhaleTier(percentile);

    return { normalized, percentile, whaleTier, min, max };
  }

  private getWhaleTier(percentile: number): number {
    if (percentile >= 0.95) return 3; // MEGA_WHALE
    if (percentile >= 0.6) return 2; // WHALE
    if (percentile >= 0.3) return 1; // BABY_WHALE
    return 0; // NONE
  }

  private getCurrentState() {
    if (this.volumes.length === 0) {
      return { normalized: 0.5, percentile: 0.5, whaleTier: 0, min: 0, max: 0 };
    }
    const last = this.volumes[this.volumes.length - 1];
    return this.calculateMetrics(last);
  }

  canSpawnWhale(now: number): boolean {
    return now - this.lastWhaleSpawn >= this.whaleCooldownMs;
  }

  recordWhaleSpawn(now: number): void {
    this.lastWhaleSpawn = now;
  }

  getHistoryCount(): number {
    return this.volumes.length;
  }

  reset(): void {
    this.volumes = [];
    this.lastWhaleSpawn = 0;
  }
}
