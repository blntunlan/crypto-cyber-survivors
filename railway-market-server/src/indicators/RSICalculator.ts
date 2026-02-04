/**
 * RSI Calculator with Hysteresis (Server-Side)
 *
 * Deterministic implementation synced with client.
 * Period: 14 candles
 * Thresholds: 30/70 with 5-point hysteresis
 * Sliding Window: 300 elements
 */
export class RSICalculator {
  private prices: number[] = [];
  private period: number;
  private currentRSI: number = 50;
  private currentState: 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT' = 'NEUTRAL';
  // State for Wilder's Smoothing
  private prevAvgGain: number | null = null;
  private prevAvgLoss: number | null = null;

  // Constants synced with client SYNC_CONFIG
  private readonly MAX_HISTORY_SIZE = 300;
  private readonly PRECISION = 6;

  constructor(period: number = 14) {
    this.period = period;
  }

  update(price: number): { rsi: number; state: string } {
    if (!Number.isFinite(price) || price <= 0) {
      return { rsi: this.currentRSI, state: this.currentState };
    }

    // Add price to history
    this.prices.push(price);

    // Sliding Window
    if (this.prices.length > this.MAX_HISTORY_SIZE) {
      this.prices.shift();
    }

    // Need period+1 prices to calculate initial SMA
    if (this.prices.length < this.period + 1) {
      return { rsi: this.currentRSI, state: this.currentState };
    }

    const currentPrice = this.prices.at(-1) ?? 0;
    const previousPrice = this.prices.at(-2) ?? 0;
    const change = currentPrice - previousPrice;

    const currentGain = change > 0 ? change : 0;
    const currentLoss = change < 0 ? -change : 0;

    // Initialize with SMA if not set
    if (this.prevAvgGain === null || this.prevAvgLoss === null) {
      let gains = 0;
      let losses = 0;

      // Calculate initial SMA from first 'period' changes
      for (let i = 1; i < this.prices.length; i++) {
        const c = (this.prices[i] ?? 0) - (this.prices[i - 1] ?? 0);
        if (c > 0) gains += c;
        else losses -= c;
      }

      this.prevAvgGain = gains / this.period;
      this.prevAvgLoss = losses / this.period;
    } else {
      // Wilder's Smoothing
      this.prevAvgGain =
        (this.prevAvgGain * (this.period - 1) + currentGain) / this.period;
      this.prevAvgLoss =
        (this.prevAvgLoss * (this.period - 1) + currentLoss) / this.period;
    }

    // Precision handling and extreme decay reset
    const MIN_AVG_THRESHOLD = 1e-12;
    if (this.prevAvgGain < MIN_AVG_THRESHOLD && this.prevAvgLoss < MIN_AVG_THRESHOLD) {
      this.prevAvgGain = null;
      this.prevAvgLoss = null;
      this.currentRSI = 50;
    } else {
      // Calculate RSI
      let rsi: number;
      if (this.prevAvgLoss < MIN_AVG_THRESHOLD) {
        rsi = this.prevAvgGain < MIN_AVG_THRESHOLD ? 50 : 100;
      } else if (this.prevAvgGain < MIN_AVG_THRESHOLD) {
        rsi = 0;
      } else {
        const rs = this.prevAvgGain / this.prevAvgLoss;
        rsi = 100 - 100 / (1 + rs);
      }

      this.currentRSI = Number(Math.max(0, Math.min(100, rsi)).toFixed(this.PRECISION));
    }

    // Update state with hysteresis
    this.currentState = this.getStateWithHysteresis();

    return { rsi: this.currentRSI, state: this.currentState };
  }

  private getStateWithHysteresis(): 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT' {
    // Entry thresholds
    if (this.currentRSI < 30) return 'OVERSOLD';
    if (this.currentRSI > 70) return 'OVERBOUGHT';

    // Exit thresholds (hysteresis)
    if (this.currentState === 'OVERSOLD' && this.currentRSI > 35) return 'NEUTRAL';
    if (this.currentState === 'OVERBOUGHT' && this.currentRSI < 65) return 'NEUTRAL';

    // Stay in current state
    return this.currentState;
  }

  reset(): void {
    this.prices = [];
    this.currentRSI = 50;
    this.currentState = 'NEUTRAL';
    this.prevAvgGain = null;
    this.prevAvgLoss = null;
  }
}
