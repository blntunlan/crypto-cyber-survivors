/**
 * ATR Calculator (Average True Range)
 *
 * Period: 14 candles
 */
export class ATRCalculator {
  private trValues: number[] = [];
  private prevClose: number | null = null;
  private period: number;

  constructor(period: number = 14) {
    this.period = period;
  }

  update(high: number, low: number, close: number): { atr: number; atrPercent: number } {
    // Calculate True Range
    let tr: number;
    if (this.prevClose === null) {
      tr = high - low;
    } else {
      tr = Math.max(high - low, Math.abs(high - this.prevClose), Math.abs(low - this.prevClose));
    }

    this.prevClose = close;
    this.trValues.push(tr);

    if (this.trValues.length > this.period) {
      this.trValues.shift();
    }

    // Calculate ATR (simple moving average of TR)
    const atr = this.trValues.reduce((a, b) => a + b, 0) / this.trValues.length;
    const atrPercent = close > 0 ? (atr / close) * 100 : 0;

    return { atr, atrPercent };
  }

  getSpawnRateMultiplier(atrPercent: number): number {
    if (atrPercent < 1.0) return 0.5; // Calm
    if (atrPercent < 2.0) return 1.0; // Normal
    if (atrPercent < 4.0) return 1.5; // Volatile
    return 2.0; // Chaos (capped)
  }

  reset(): void {
    this.trValues = [];
    this.prevClose = null;
  }
}
