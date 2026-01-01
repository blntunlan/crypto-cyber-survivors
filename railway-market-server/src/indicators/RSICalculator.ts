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

  constructor(period: number = 7) {
    this.period = period;
  }

  update(price: number): { rsi: number; state: string } {
    // Add price to history
    this.prices.push(price);
    if (this.prices.length > this.period + 1) {
      this.prices.shift();
    }

    // Need period+1 prices to calculate
    if (this.prices.length < this.period + 1) {
      return { rsi: this.currentRSI, state: this.currentState };
    }

    // Calculate gains and losses
    let gains = 0;
    let losses = 0;

    for (let i = 1; i < this.prices.length; i++) {
      const change = this.prices[i] - this.prices[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }

    const avgGain = gains / this.period;
    const avgLoss = losses / this.period;

    // Calculate RSI
    if (avgLoss === 0) {
      this.currentRSI = avgGain === 0 ? 50 : 100;
    } else {
      const rs = avgGain / avgLoss;
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
  }
}
