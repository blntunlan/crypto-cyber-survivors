import { describe, it, expect, beforeEach } from 'vitest';
import { VolumeAnalyzer } from '../../src/indicators/VolumeAnalyzer';

describe('VolumeAnalyzer', () => {
  let analyzer: VolumeAnalyzer;
  const HISTORY_SIZE = 50;
  const COOLDOWN_MS = 10000; // 10s

  beforeEach(() => {
    analyzer = new VolumeAnalyzer(HISTORY_SIZE, COOLDOWN_MS);
  });

  describe('Initialization', () => {
    it('should initialize with empty state', () => {
      expect(analyzer.getHistoryCount()).toBe(0);
      expect(analyzer.getMean()).toBe(0);
      expect(analyzer.getStdDev()).toBe(0);
    });
  });

  describe('Statistics calculation', () => {
    it('should calculate mean correctly', () => {
      analyzer.update(10);
      analyzer.update(20);
      analyzer.update(30);
      expect(analyzer.getMean()).toBe(20);
    });

    it('should calculate standard deviation correctly', () => {
      // Small set: 10, 20
      // Mean = 15
      // SumSquares = 100 + 400 = 500
      // Variance = (500 / 2) - 15^2 = 250 - 225 = 25
      // StdDev = sqrt(25) = 5
      analyzer.update(10);
      analyzer.update(20);
      expect(analyzer.getStdDev()).toBeCloseTo(5);
    });

    it('should maintain rolling window statistics correctly', () => {
      const smallAnalyzer = new VolumeAnalyzer(2);
      smallAnalyzer.update(10); // Mean 10
      smallAnalyzer.update(20); // Mean 15
      smallAnalyzer.update(30); // Mean 25 (10 is removed)

      expect(smallAnalyzer.getHistoryCount()).toBe(2);
      expect(smallAnalyzer.getMean()).toBe(25);
    });
  });

  describe('Whale Detection', () => {
    it('should not detect whales before minimum data points (n < 10)', () => {
      for (let i = 0; i < 9; i++) {
        const metrics = analyzer.update(100);
        expect(metrics.whaleTier).toBe(0);
      }
    });

    it('should detect BABY_WHALE (z-score >= 1.5)', () => {
      // Fill with baseline data
      for (let i = 0; i < 100; i++) {
        analyzer.update(100);
      }

      // Add variance: Mean=100
      analyzer.update(110);
      analyzer.update(90);

      const stdDev = analyzer.getStdDev();
      // Use a slightly higher multiplier to ensure z-score stays above threshold
      // even after adding the spike to the mean/stddev
      const spikeVolume = 100 + stdDev * 2.0;

      const metrics = analyzer.update(spikeVolume);
      expect(metrics.zScore).toBeGreaterThanOrEqual(1.5);
      expect(metrics.whaleTier).toBeGreaterThanOrEqual(1);
    });

    it('should detect WHALE (z-score >= 2.0)', () => {
      for (let i = 0; i < 100; i++) analyzer.update(100);
      analyzer.update(110);
      analyzer.update(90);

      const stdDev = analyzer.getStdDev();
      const spikeVolume = 100 + stdDev * 3.0;

      const metrics = analyzer.update(spikeVolume);
      expect(metrics.whaleTier).toBeGreaterThanOrEqual(2);
    });

    it('should detect MEGA_WHALE (z-score >= 2.5)', () => {
      for (let i = 0; i < 100; i++) analyzer.update(100);
      analyzer.update(110);
      analyzer.update(90);

      const stdDev = analyzer.getStdDev();
      const spikeVolume = 100 + stdDev * 5.0;

      const metrics = analyzer.update(spikeVolume);
      expect(metrics.whaleTier).toBe(3); // MEGA_WHALE
    });
  });

  describe('Cooldown Logic', () => {
    it('should respect spawn cooldown', () => {
      const now = Date.now();
      expect(analyzer.canSpawnWhale(now)).toBe(true);

      analyzer.recordWhaleSpawn(now);
      expect(analyzer.canSpawnWhale(now + 1000)).toBe(false); // Only 1s passed
      expect(analyzer.canSpawnWhale(now + COOLDOWN_MS + 1)).toBe(true); // Cooldown passed
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero volume inputs gracefully', () => {
      const metrics = analyzer.update(0);
      expect(metrics.volume).toBe(0);
      expect(analyzer.getHistoryCount()).toBe(0);
    });

    it('should handle NaN/Infinite inputs gracefully', () => {
      analyzer.update(100);
      const metrics = analyzer.update(NaN);
      expect(metrics.volume).toBe(100);
      expect(analyzer.getHistoryCount()).toBe(1);
    });

    it('should handle zero variance correctly (all values same)', () => {
      for (let i = 0; i < 15; i++) analyzer.update(100);
      const metrics = analyzer.update(100);
      expect(metrics.zScore).toBe(0);
      expect(metrics.whaleTier).toBe(0);
    });
  });

  describe('Reset', () => {
    it('should clear all data on reset', () => {
      analyzer.update(100);
      analyzer.update(200);
      analyzer.reset();

      expect(analyzer.getHistoryCount()).toBe(0);
      expect(analyzer.getMean()).toBe(0);
      expect(analyzer.getStdDev()).toBe(0);
    });
  });
});
