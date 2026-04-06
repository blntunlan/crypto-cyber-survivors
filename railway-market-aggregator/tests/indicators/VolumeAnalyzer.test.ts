import { describe, it, expect, beforeEach } from 'vitest';
import { VolumeAnalyzer } from '../../src/indicators/VolumeAnalyzer';

describe('VolumeAnalyzer', () => {
  let analyzer: VolumeAnalyzer;

  beforeEach(() => {
    analyzer = new VolumeAnalyzer(300, 30000);
  });

  describe('initialization', () => {
    it('starts with empty history', () => {
      expect(analyzer.getHistoryCount()).toBe(0);
      expect(analyzer.getMean()).toBe(0);
      expect(analyzer.getStdDev()).toBe(0);
    });
  });

  describe('with insufficient data (< 10 points)', () => {
    it('returns neutral metrics when fewer than 10 data points', () => {
      const result = analyzer.update(1000);
      expect(result.normalized).toBe(0.5);
      expect(result.percentile).toBe(0.5);
      expect(result.zScore).toBe(0);
      expect(result.whaleTier).toBe(0);
    });

    it('still tracks volume even with few data points', () => {
      analyzer.update(1000);
      expect(analyzer.getHistoryCount()).toBe(1);
      expect(result(analyzer.update(2000)).volume).toBe(2000);
    });
  });

  describe('calculation with known volume series', () => {
    function feedVolumes(va: VolumeAnalyzer, volumes: number[]) {
      let last;
      for (const v of volumes) {
        last = va.update(v);
      }
      return last!;
    }

    it('computes correct z-score for a spike', () => {
      // Feed 20 volumes of 100, then a spike of 300
      const volumes = Array(20).fill(100);
      feedVolumes(analyzer, volumes);

      const spike = analyzer.update(300);
      // Mean ~= 104.76 (20*100 + 300) / 21, but analyzer uses running stats
      // z-score should be positive and significant
      expect(spike.zScore).toBeGreaterThan(1);
      expect(spike.whaleTier).toBeGreaterThanOrEqual(1);
    });

    it('computes normalized value correctly', () => {
      const volumes = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      feedVolumes(analyzer, volumes);

      const result = analyzer.update(100);
      // 100 is the max, so normalized should be 1.0
      expect(result.normalized).toBeCloseTo(1.0, 2);
    });

    it('computes percentile correctly', () => {
      const volumes = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      feedVolumes(analyzer, volumes);

      // Adding a value at the very top
      const result = analyzer.update(110);
      // All 10 previous + 100 values are below 110
      expect(result.percentile).toBeGreaterThan(0.9);
    });

    it('assigns correct whale tiers based on z-score', () => {
      // Feed volumes with some natural variance so stdDev > 0
      const stableVolumes = Array.from({ length: 50 }, (_, i) => 95 + (i % 10));
      feedVolumes(analyzer, stableVolumes);

      // Volume near mean - no whale
      const small = analyzer.update(100);
      expect(small.whaleTier).toBe(0);

      // Reset and test whale tiers with variance
      analyzer.reset();
      const stableVolumes2 = Array.from({ length: 50 }, (_, i) => 95 + (i % 10));
      feedVolumes(analyzer, stableVolumes2);

      // Massive spike should trigger whale
      const massive = analyzer.update(10000);
      expect(massive.whaleTier).toBe(3); // MEGA_WHALE
    });
  });

  describe('edge cases', () => {
    it('ignores invalid (non-finite) volumes', () => {
      analyzer.update(100);
      const result = analyzer.update(NaN);
      // getCurrentMetrics returns last valid volume's metrics (100)
      expect(result.volume).toBe(100);
      expect(analyzer.getHistoryCount()).toBe(1); // NaN was rejected
    });

    it('ignores zero volume', () => {
      analyzer.update(100);
      const before = analyzer.getHistoryCount();
      analyzer.update(0);
      expect(analyzer.getHistoryCount()).toBe(before);
    });

    it('ignores negative volume', () => {
      analyzer.update(100);
      const before = analyzer.getHistoryCount();
      analyzer.update(-50);
      expect(analyzer.getHistoryCount()).toBe(before);
    });

    it('handles all-same values', () => {
      for (let i = 0; i < 20; i++) {
        analyzer.update(100);
      }
      const result = analyzer.update(100);
      // StdDev should be 0, z-score should be 0
      expect(result.stdDev).toBe(0);
      expect(result.zScore).toBe(0);
      expect(result.whaleTier).toBe(0);
    });

    it('handles empty array via getCurrentMetrics fallback', () => {
      const metrics = analyzer.update(NaN); // invalid, won't add — empty history
      expect(metrics.volume).toBe(0);
      expect(metrics.normalized).toBe(0.5);
      expect(metrics.whaleTier).toBe(0);
    });
  });

  describe('whale cooldown', () => {
    it('canSpawnWhale returns true initially', () => {
      expect(analyzer.canSpawnWhale(Date.now())).toBe(true);
    });

    it('canSpawnWhale returns false within cooldown', () => {
      const now = 100000;
      analyzer.recordWhaleSpawn(now);
      expect(analyzer.canSpawnWhale(now + 10000)).toBe(false); // 10s < 30s cooldown
    });

    it('canSpawnWhale returns true after cooldown expires', () => {
      const now = 100000;
      analyzer.recordWhaleSpawn(now);
      expect(analyzer.canSpawnWhale(now + 30000)).toBe(true);
    });
  });

  describe('getThresholds', () => {
    it('returns whale z-score thresholds', () => {
      const thresholds = analyzer.getThresholds();
      expect(thresholds.BABY_WHALE).toBe(1.5);
      expect(thresholds.WHALE).toBe(2.0);
      expect(thresholds.MEGA_WHALE).toBe(2.5);
    });
  });

  describe('sliding window', () => {
    it('caps history at configured size', () => {
      const small = new VolumeAnalyzer(10);
      for (let i = 1; i <= 15; i++) {
        small.update(i * 100);
      }
      expect(small.getHistoryCount()).toBe(10);
    });
  });

  describe('reset', () => {
    it('reset() clears all state', () => {
      for (let i = 0; i < 20; i++) {
        analyzer.update((i + 1) * 100);
      }
      analyzer.recordWhaleSpawn(Date.now());

      analyzer.reset();
      expect(analyzer.getHistoryCount()).toBe(0);
      expect(analyzer.getMean()).toBe(0);
      expect(analyzer.getStdDev()).toBe(0);
      expect(analyzer.canSpawnWhale(Date.now())).toBe(true); // lastWhaleSpawn reset to 0
    });
  });
});

// Helper to extract result without reassigning
function result(metrics: ReturnType<VolumeAnalyzer['update']>) {
  return metrics;
}
