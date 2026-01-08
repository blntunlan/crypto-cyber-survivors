/**
 * RSI Calculator with Hysteresis (Server-Side)
 *
 * Period: 7 candles
 * Thresholds: 30/70 with 5-point hysteresis
 */
export class RSICalculator {
  private prices: number[] = [];
  private period: number;
  private currentRSI: number = 50;
  private currentState: 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT' = 'NEUTRAL';
  // State for Wilder's Smoothing
  private prevAvgGain: number | null = null;
  private prevAvgLoss: number | null = null;

  constructor(period: number = 14) {
    this.period = period;
  }

  update(price: number): { rsi: number; state: string } {
    // Add price to history
    this.prices.push(price);

    // Limit history size but keep enough for initial calc (period + 1)
    if (this.prevAvgGain !== null && this.prices.length > this.period + 10) {
      this.prices.shift();
    }

    // Need period+1 prices to calculate initial SMA
    if (this.prices.length < this.period + 1) {
      return { rsi: this.currentRSI, state: this.currentState };
    }

    // Calculate change from last update
    // Note: update is called after pushing new price but prices array has the new price at the end
    // If we just pushed the price, prices.length-1 is current, prices.length-2 is prev.
    // However, in the very first run (length == period+1), we might need to calc SMA first.

    // Check if initialized (prevAvg set)
    if (this.prevAvgGain === null || this.prevAvgLoss === null) {
      // First time: Calculate SMA
      let gains = 0;
      let losses = 0;

      // Use the last 'period' changes
      // History has period + 1 prices -> period changes.
      // Iterate from index 1 to the end
      // But wait, if prices has accumulated more history (which shouldn't happen much given logic), take last period.

      const startIndex = this.prices.length - this.period;

      for (let i = startIndex; i < this.prices.length; i++) {
        const change = this.prices[i]! - this.prices[i - 1]!;
        if (change > 0) gains += change;
        else losses -= change; // change is negative, so subtract it to add positive loss
      }

      this.prevAvgGain = gains / this.period;
      this.prevAvgLoss = losses / this.period;
    } else {
      // Wilder's Smoothing
      // Get latest change
      const currentPrice = this.prices[this.prices.length - 1]!;
      const previousPrice = this.prices[this.prices.length - 2]!;
      const change = currentPrice - previousPrice;

      const currentGain = change > 0 ? change : 0;
      const currentLoss = change < 0 ? -change : 0;

      this.prevAvgGain = (this.prevAvgGain * (this.period - 1) + currentGain) / this.period;
      this.prevAvgLoss = (this.prevAvgLoss * (this.period - 1) + currentLoss) / this.period;
    }

    // Prevent extreme decay: if both averages are near-zero, reset to fresh SMA
    // This prevents RSI from getting stuck at 0 or 100 due to floating-point decay
    const MIN_AVG_THRESHOLD = 1e-12; // High precision
    if (this.prevAvgGain < MIN_AVG_THRESHOLD && this.prevAvgLoss < MIN_AVG_THRESHOLD) {
      // Both have decayed too much - reset to recalculate fresh SMA next update
      this.prevAvgGain = null;
      this.prevAvgLoss = null;
      return { rsi: 50, state: 'NEUTRAL' };
    }

    // Calculate RSI
    if (this.prevAvgLoss < MIN_AVG_THRESHOLD) {
      this.currentRSI = this.prevAvgGain < MIN_AVG_THRESHOLD ? 50 : 100;
    } else if (this.prevAvgGain < MIN_AVG_THRESHOLD) {
      this.currentRSI = 0;
    } else {
      const rs = this.prevAvgGain / this.prevAvgLoss;
      this.currentRSI = 100 - 100 / (1 + rs);
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
