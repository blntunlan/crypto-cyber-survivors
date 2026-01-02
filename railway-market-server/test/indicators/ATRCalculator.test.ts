import { describe, it, expect, beforeEach } from 'vitest';
import { ATRCalculator } from '../../src/indicators/ATRCalculator';

describe('ATRCalculator', () => {
  let calculator: ATRCalculator;
  const PERIOD = 3;

  beforeEach(() => {
    calculator = new ATRCalculator(PERIOD);
  });

  it('should calculate TR correctly for the first candle', () => {
    // TR = High - Low = 105 - 95 = 10
    const result = calculator.update(105, 95, 100);
    expect(result.atr).toBe(10);
    expect(result.atrPercent).toBe(10);
  });

  it('should calculate TR correctly for subsequent candles', () => {
    // First candle: High=105, Low=95, Close=100. TR=10.
    calculator.update(105, 95, 100);

    // Second candle: High=110, Low=105, Close=108.
    // PrevClose=100.
    // TR = max(110-105, abs(110-100), abs(105-100)) = max(5, 10, 5) = 10.
    const result = calculator.update(110, 105, 108);
    expect(result.atr).toBe(10); // Average of [10, 10]
  });

  it('should maintain the specified period', () => {
    calculator.update(105, 95, 100); // TR=10. History: [10]
    calculator.update(110, 100, 105); // High=110, Low=100, PrevClose=100. TR=10. History: [10, 10]
    calculator.update(120, 110, 115); // High=120, Low=110, PrevClose=105. TR=15. History: [10, 10, 15]
    calculator.update(200, 100, 150); // High=200, Low=100, PrevClose=115. TR=100. History: [10, 15, 100]

    // Period is 3, so first TR (10) should be removed.
    const result = calculator.update(160, 140, 150); // High=160, Low=140, PrevClose=150. TR=20.
    // History should be [15, 100, 20]
    expect(result.atr).toBe((15 + 100 + 20) / 3);
  });

  it('should calculate spawn rate multiplier correctly', () => {
    expect(calculator.getSpawnRateMultiplier(0.5)).toBe(0.5);
    expect(calculator.getSpawnRateMultiplier(1.5)).toBe(1.0);
    expect(calculator.getSpawnRateMultiplier(3.0)).toBe(1.5);
    expect(calculator.getSpawnRateMultiplier(5.0)).toBe(2.0);
  });

  it('should calculate atrPercent correctly', () => {
    const result = calculator.update(110, 90, 100);
    // ATR = 20, Close = 100 -> 20%
    expect(result.atrPercent).toBe(20);
  });

  it('should handle zero close price gracefully', () => {
    const result = calculator.update(10, 0, 0);
    expect(result.atrPercent).toBe(0);
  });

  it('should clear data on reset', () => {
    calculator.update(105, 95, 100);
    calculator.reset();
    const result = calculator.update(105, 95, 100);
    expect(result.atr).toBe(10); // Should treat as first candle
  });
});
