import { describe, it, expect } from 'vitest';
import {
  generateBackgroundCandles,
  generateDefaultCandles,
} from '../../../utils/backgroundCandles';
import { DeviceProfile, type PerformanceConfig } from '../../../types/DeviceProfile';

describe('backgroundCandles', () => {
  const config: PerformanceConfig = {
    profile: DeviceProfile.HIGH,
    candleCount: 20,
    shadowsEnabled: false,
    glowEnabled: false,
    particleMultiplier: 1,
    maxEnemies: 60,
    gradientBackground: true,
    targetFPS: 60,
  };

  it('generates exactly the configured amount with valid bounds', () => {
    const candles = generateBackgroundCandles(1200, 800, config);

    expect(candles).toHaveLength(config.candleCount);

    for (const candle of candles) {
      expect(candle.x).toBeGreaterThanOrEqual(0);
      expect(candle.x).toBeLessThan(1200);
      expect(candle.y).toBeGreaterThanOrEqual(0);
      expect(candle.y).toBeLessThanOrEqual(800);
      expect(candle.layer).toBeGreaterThanOrEqual(1);
      expect(candle.layer).toBeLessThanOrEqual(3);
      expect(candle.color.length).toBeGreaterThan(0);
      expect(candle.speed).toBeGreaterThan(0);
    }
  });

  it('keeps deterministic layer distribution ratios', () => {
    const candles = generateBackgroundCandles(1000, 600, config);
    const layer1 = candles.filter(c => c.layer === 1).length;
    const layer2 = candles.filter(c => c.layer === 2).length;
    const layer3 = candles.filter(c => c.layer === 3).length;

    expect(layer1).toBe(Math.floor(config.candleCount * 0.35));
    expect(layer2).toBe(Math.floor(config.candleCount * 0.4));
    expect(layer3).toBe(config.candleCount - layer1 - layer2);
  });

  it('uses medium-like defaults for initial candle generation', () => {
    const candles = generateDefaultCandles(1920, 1080);
    expect(candles).toHaveLength(70);
  });
});
