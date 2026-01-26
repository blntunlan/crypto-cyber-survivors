/**
 * ATR Calculator (Average True Range)
 *
 * Deterministic implementation synced with server.
 * Period: 14 candles
 * Sliding Window: 300 elements
 */
import { SYNC_CONFIG } from '../../types/indicators';

export class ATRCalculator {
  private trValues: number[] = [];
  private prevClose: number | null = null;
  private period: number;

  constructor(period: number = SYNC_CONFIG.ATR_PERIOD) {
    this.period = period;
  }

  /**
   * Update ATR with new OHLC data (simplified for 1s candles)
   *
   * @param high High price
   * @param low Low price
   * @param close Close price
   * @returns ATR result
   */
  update(
    high: number,
    low: number,
    close: number
  ): { atr: number; atrPercent: number } {
    // Calculate True Range (TR)
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

    // Sliding Window (Limited to MAX_HISTORY_SIZE but SMA only uses 'period')
    if (this.trValues.length > SYNC_CONFIG.MAX_HISTORY_SIZE) {
      this.trValues.shift();
    }

    // Calculate ATR (Simple Moving Average of current TR window)
    // We only take the last 'period' values for the calculation
    const window = this.trValues.slice(-this.period);
    const atr = window.reduce((a, b) => a + b, 0) / window.length;

    // Calculate ATR Percent for difficulty scaling
    const rawAtrPercent = close > 0 ? (atr / close) * 100 : 0;

    // Fix precision for determinism
    const fixedAtr = Number(atr.toFixed(10)); // High precision for absolute ATR
    const fixedAtrPercent = Number(rawAtrPercent.toFixed(SYNC_CONFIG.PRECISION));

    return { atr: fixedAtr, atrPercent: fixedAtrPercent };
  }

  /**
   * Check if the calculator is initialized
   */
  isInitialized(): boolean {
    return this.trValues.length >= 1;
  }

  /**
   * Reset calculator state
   */
  reset(): void {
    this.trValues = [];
    this.prevClose = null;
  }
}
