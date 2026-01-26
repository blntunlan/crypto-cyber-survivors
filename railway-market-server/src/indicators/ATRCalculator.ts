/**
 * ATR Calculator (Average True Range)
 *
 * Deterministic implementation synced with client.
 * Period: 14 candles
 * Sliding Window: 300 elements
 */
export class ATRCalculator {
  private trValues: number[] = [];
  private prevClose: number | null = null;
  private period: number;

  // Constants synced with client SYNC_CONFIG
  private readonly MAX_HISTORY_SIZE = 300;
  private readonly PRECISION = 6;

  constructor(period: number = 14) {
    this.period = period;
  }

  update(
    high: number,
    low: number,
    close: number
  ): { atr: number; atrPercent: number } {
    // Calculate True Range
    let tr: number;
    if (this.prevClose === null) {
      tr = high - low;
    } else {
      tr = Math.max(
        high - low,
        Math.abs(high - this.prevClose),
        Math.abs(low - this.prevClose)
      );
    }

    this.prevClose = close;
    this.trValues.push(tr);

    // Sliding Window
    if (this.trValues.length > this.MAX_HISTORY_SIZE) {
      this.trValues.shift();
    }

    // Calculate ATR (SMA of the last 'period' TR values)
    const window = this.trValues.slice(-this.period);
    const atr = window.reduce((a, b) => a + b, 0) / window.length;

    // Calculate ATR Percent
    const rawAtrPercent = close > 0 ? (atr / close) * 100 : 0;

    // Fix precision for determinism
    const fixedAtr = Number(atr.toFixed(10));
    const fixedAtrPercent = Number(rawAtrPercent.toFixed(this.PRECISION));

    return { atr: fixedAtr, atrPercent: fixedAtrPercent };
  }

  getSpawnRateMultiplier(atrPercent: number): number {
    // Thresholds adjusted for 1-second candles
    if (atrPercent < 0.005) return 0.5; // Calm
    if (atrPercent < 0.015) return 1.0; // Normal
    if (atrPercent < 0.03) return 1.5; // Volatile
    return 2.0; // Chaos (capped)
  }

  reset(): void {
    this.trValues = [];
    this.prevClose = null;
  }
}
