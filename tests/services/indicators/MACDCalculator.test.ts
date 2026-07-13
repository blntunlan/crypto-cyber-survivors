import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MACDCalculator } from '../../../services/indicators/MACDCalculator';
import { EventBus } from '../../../services/core/EventBus';

describe('MACDCalculator', () => {
  let calculator: MACDCalculator;

  beforeEach(() => {
    calculator = new MACDCalculator();
  });

  afterEach(() => {
    calculator.dispose();
  });

  it('unsubscribes from gameReset exactly once when disposed', () => {
    const resetSpy = vi.spyOn(calculator, 'reset');

    calculator.dispose();
    calculator.dispose();
    EventBus.emit('gameReset', {});

    expect(resetSpy).toHaveBeenCalledTimes(1);
  });

  it('should initialize with zeros', () => {
    const result = calculator.getResult();
    expect(result.macd).toBe(0);
    expect(result.signal).toBe(0);
    expect(result.histogram).toBe(0);
    expect(calculator.isInitialized()).toBe(false);
  });

  it('should calculate MACD after enough data points (period 26)', () => {
    // Standard periods: Fast 12, Slow 26, Signal 9
    // Need at least 26 points for first MACD line
    // And more for Signal line to be reliable (though it starts after signal period of MACD lines)

    const prices = Array.from({ length: 40 }, (_, i) => 100 + i); // Uptrend

    let lastResult;
    for (const price of prices) {
      lastResult = calculator.update(price);
    }

    expect(calculator.isInitialized()).toBe(true);
    expect(lastResult?.macd).not.toBe(0);
    expect(lastResult?.signal).not.toBe(0);
    expect(lastResult?.histogram).not.toBe(0);
  });

  it('should detect trend reversals', () => {
    // 1. Establish uptrend
    // Need at least 26 (slow) + 9 (signal) points
    for (let i = 0; i < 40; i++) {
      calculator.update(100 + i);
    }
    const uptrendHistogram = calculator.getResult().histogram;
    expect(calculator.isInitialized()).toBe(true);
    expect(uptrendHistogram).toBeGreaterThan(0);

    // 2. Sudden downtrend
    let downtrendResult;
    for (let i = 0; i < 20; i++) {
      downtrendResult = calculator.update(140 - i * 5);
    }

    expect(downtrendResult?.histogram).toBeLessThan(uptrendHistogram);
  });

  it('should reset state correctly', () => {
    for (let i = 0; i < 40; i++) {
      calculator.update(100 + i);
    }
    expect(calculator.isInitialized()).toBe(true);

    calculator.reset();
    expect(calculator.isInitialized()).toBe(false);
    expect(calculator.getResult().macd).toBe(0);
  });

  it('should handle price spikes (tanh squash check)', () => {
    // Fill history
    for (let i = 0; i < 30; i++) {
      calculator.update(100);
    }

    const spikePrice = 200;
    const result = calculator.update(spikePrice);

    expect(Number.isFinite(result.macd)).toBe(true);
    expect(Math.abs(result.macd)).toBeLessThan(1000); // Sanity check
  });
});
