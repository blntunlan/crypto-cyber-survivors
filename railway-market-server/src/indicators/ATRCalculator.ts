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
  private lastPrice: number | null = null;
  private lastResult: { atr: number; atrPercent: number } = { atr: 0, atrPercent: 0 };

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
    // Validate inputs
    if (!Number.isFinite(close) || close <= 0) {
      return this.lastResult;
    }

    // Skip unchanged prices to avoid TR=0 dilution.
    if (this.lastPrice !== null && close === this.lastPrice) {
      return this.lastResult;
    }
    this.lastPrice = close;

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

    this.lastResult = { atr: fixedAtr, atrPercent: fixedAtrPercent };
    return this.lastResult;
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
    this.lastPrice = null;
    this.lastResult = { atr: 0, atrPercent: 0 };
  }
}
