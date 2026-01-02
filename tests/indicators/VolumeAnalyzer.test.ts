/**
 * Volume Analyzer Tests
 *
 * Tests the volume normalization and whale detection system.
 * Now uses z-score based normalization with sigmoid mapping.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createVolumeAnalyzer,
  type VolumeAnalyzer,
} from '../../services/indicators/VolumeAnalyzer';
import { DEFAULT_VOLUME_CONFIG, WhaleTier } from '../../types/indicators';

describe('VolumeAnalyzer', () => {
  let analyzer: VolumeAnalyzer;

  beforeEach(() => {
    analyzer = createVolumeAnalyzer();
  });

  afterEach(() => {
    analyzer.dispose();
  });

  describe('Initialization', () => {
    it('should start with neutral normalized volume (0.5)', () => {
      expect(analyzer.getNormalizedVolume()).toBe(0.5);
    });

    it('should start with NONE whale tier', () => {
      expect(analyzer.getWhaleTier()).toBe(WhaleTier.NONE);
    });

    it('should not be initialized with no data', () => {
      expect(analyzer.isInitialized()).toBe(false);
    });

    it('should be initialized after minimum history', () => {
      // Need minHistoryForWhale (10) data points
      for (let i = 0; i < 10; i++) {
        analyzer.update(1000 + i * 100);
      }
      expect(analyzer.isInitialized()).toBe(true);
    });

    it('should track rolling statistics correctly', () => {
      analyzer.update(100);
      analyzer.update(200);
      analyzer.update(300);

      const stats = analyzer.getStats();
      expect(stats.count).toBe(3);
      expect(stats.mean).toBe(200);
      expect(stats.stdDev).toBeGreaterThan(0);
    });
  });

  describe('Volume Normalization (Z-Score)', () => {
    it('should return 0.5 when not enough data', () => {
      analyzer.update(1000);
      expect(analyzer.getNormalizedVolume()).toBe(0.5);
    });

    it('should normalize volume to 0-1 range using sigmoid', () => {
      // Build up history with varied volumes
      const volumes = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
      volumes.forEach(v => analyzer.update(v));

      // Z-score normalization maps through sigmoid
      // Max volume should be > 0.5 (above mean)
      const result = analyzer.getNormalizedVolume();
      expect(result).toBeGreaterThan(0.5);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should normalize below-mean volume to < 0.5', () => {
      // Build history
      const volumes = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
      volumes.forEach(v => analyzer.update(v));

      // Add low volume (below mean)
      analyzer.update(100);
      expect(analyzer.getNormalizedVolume()).toBeLessThan(0.5);
    });

    it('should normalize mean volume to ~0.5', () => {
      // Build history with consistent mean
      for (let i = 0; i < 20; i++) {
        analyzer.update(500);
      }
      // Add the mean value
      analyzer.update(500);
      expect(analyzer.getNormalizedVolume()).toBe(0.5);
    });

    it('should return 0.5 when all volumes are the same (std = 0)', () => {
      // All same volumes
      for (let i = 0; i < 10; i++) {
        analyzer.update(1000);
      }
      expect(analyzer.getNormalizedVolume()).toBe(0.5);
    });

    it('should handle extreme outliers with sigmoid clamping', () => {
      // Normal volumes
      for (let i = 0; i < 10; i++) {
        analyzer.update(1000);
      }

      // Massive spike (10x normal)
      analyzer.update(10000);

      // Sigmoid should clamp to near 1 but not exceed
      const result = analyzer.getNormalizedVolume();
      expect(result).toBeGreaterThan(0.9);
      expect(result).toBeLessThanOrEqual(1);
    });
  });

  describe('Whale Tier Detection', () => {
    it('should detect NONE tier for below-mean volume', () => {
      // Build baseline history
      for (let i = 0; i < 20; i++) {
        analyzer.update(1000);
      }

      // Add slightly below-mean volume
      analyzer.update(900);
      expect(analyzer.getWhaleTier()).toBe(WhaleTier.NONE);
    });

    it('should detect higher tier for significant volume spike', () => {
      // Build baseline with consistent volume
      for (let i = 0; i < 20; i++) {
        analyzer.update(1000);
      }

      // Big spike - should trigger whale tier
      analyzer.update(3000); // 2 std devs above mean approx
      expect(analyzer.getWhaleTier()).not.toBe(WhaleTier.NONE);
    });

    it('should update tier correctly as volume changes', () => {
      // Build baseline
      for (let i = 0; i < 20; i++) {
        analyzer.update(1000);
      }

      // Low volume → NONE
      analyzer.update(500);
      expect(analyzer.getWhaleTier()).toBe(WhaleTier.NONE);

      // Spike → higher tier
      analyzer.update(5000);
      expect(analyzer.getWhaleTier()).not.toBe(WhaleTier.NONE);
    });
  });

  describe('Whale Spawn Cooldown', () => {
    beforeEach(() => {
      // Build up history with variance to enable whale spawning
      for (let i = 0; i < 10; i++) {
        analyzer.update(1000 + (i % 3) * 100);
      }
    });

    it('should not spawn whale when tier is NONE', () => {
      analyzer.update(500); // Low volume → NONE tier
      const result = analyzer.shouldSpawnWhale(Date.now());
      expect(result.shouldSpawn).toBe(false);
    });

    it('should not spawn whale when not initialized', () => {
      const freshAnalyzer = createVolumeAnalyzer();
      freshAnalyzer.update(1000); // Only 1 data point
      const result = freshAnalyzer.shouldSpawnWhale(Date.now());
      expect(result.shouldSpawn).toBe(false);
      freshAnalyzer.dispose();
    });

    it('should respect cooldown between spawns', () => {
      // Set high volume for potential spawn
      analyzer.update(5000);

      const now = Date.now();

      // Record a spawn
      analyzer.recordWhaleSpawn(now);

      // Should be on cooldown
      expect(analyzer.isOnCooldown(now + 1000)).toBe(true);
      expect(analyzer.isOnCooldown(now + 4000)).toBe(true);

      // Should not be on cooldown after interval
      expect(analyzer.isOnCooldown(now + 6000)).toBe(false);
    });

    it('should return correct cooldown remaining', () => {
      const now = 10000;
      analyzer.recordWhaleSpawn(now);

      // 5000ms cooldown configured
      expect(analyzer.getCooldownRemaining(now + 2000)).toBe(3000);
      expect(analyzer.getCooldownRemaining(now + 5000)).toBe(0);
      expect(analyzer.getCooldownRemaining(now + 6000)).toBe(0);
    });

    it('should not spawn during cooldown even with high volume', () => {
      analyzer.update(5000); // High volume tier
      const now = Date.now();

      // Mock random to always succeed
      vi.spyOn(Math, 'random').mockReturnValue(0);

      // Record a spawn
      analyzer.recordWhaleSpawn(now);

      // Within cooldown - should not spawn
      const result = analyzer.shouldSpawnWhale(now + 1000);
      expect(result.shouldSpawn).toBe(false);

      vi.restoreAllMocks();
    });
  });

  describe('Edge Cases', () => {
    it('should ignore invalid volume (NaN)', () => {
      analyzer.update(1000);
      const prevVolume = analyzer.getNormalizedVolume();
      analyzer.update(NaN);
      expect(analyzer.getNormalizedVolume()).toBe(prevVolume);
    });

    it('should ignore invalid volume (Infinity)', () => {
      analyzer.update(1000);
      const prevVolume = analyzer.getNormalizedVolume();
      analyzer.update(Infinity);
      expect(analyzer.getNormalizedVolume()).toBe(prevVolume);
    });

    it('should ignore invalid volume (negative)', () => {
      analyzer.update(1000);
      const prevVolume = analyzer.getNormalizedVolume();
      analyzer.update(-500);
      expect(analyzer.getNormalizedVolume()).toBe(prevVolume);
    });

    it('should ignore invalid volume (zero)', () => {
      analyzer.update(1000);
      const prevVolume = analyzer.getNormalizedVolume();
      analyzer.update(0);
      expect(analyzer.getNormalizedVolume()).toBe(prevVolume);
    });

    it('should limit history size', () => {
      // Add more than historySize (100) volumes
      for (let i = 0; i < 150; i++) {
        analyzer.update(1000 + i);
      }

      expect(analyzer.getHistoryLength()).toBeLessThanOrEqual(DEFAULT_VOLUME_CONFIG.historySize);
    });

    it('should maintain accurate rolling stats when removing old values', () => {
      // Fill history to max
      for (let i = 0; i < 100; i++) {
        analyzer.update(1000);
      }

      // Add new values to trigger removal
      for (let i = 0; i < 10; i++) {
        analyzer.update(1000);
      }

      const stats = analyzer.getStats();
      expect(stats.mean).toBeCloseTo(1000, 5);
      expect(stats.count).toBe(100);
    });
  });

  describe('Reset and Dispose', () => {
    it('should reset all state', () => {
      // Build up state
      for (let i = 0; i < 10; i++) {
        analyzer.update(1000 + i * 100);
      }
      analyzer.recordWhaleSpawn(Date.now());

      expect(analyzer.getHistoryLength()).toBe(10);

      // Reset
      analyzer.reset();

      expect(analyzer.getNormalizedVolume()).toBe(0.5);
      expect(analyzer.getWhaleTier()).toBe(WhaleTier.NONE);
      expect(analyzer.getHistoryLength()).toBe(0);
      expect(analyzer.isInitialized()).toBe(false);
      expect(analyzer.isOnCooldown(Date.now())).toBe(false);
      expect(analyzer.getStats().count).toBe(0);
    });

    it('should handle dispose correctly', () => {
      const testAnalyzer = createVolumeAnalyzer();
      testAnalyzer.update(1000);
      testAnalyzer.dispose();

      // After dispose, update should warn and return safely
      const result = testAnalyzer.update(2000);
      expect(result).toBe(0.5); // Returns default after dispose
    });

    it('should be safe to call dispose multiple times', () => {
      const testAnalyzer = createVolumeAnalyzer();
      testAnalyzer.dispose();
      expect(() => testAnalyzer.dispose()).not.toThrow();
    });
  });

  describe('Custom Configuration', () => {
    it('should use custom history size', () => {
      const customAnalyzer = createVolumeAnalyzer({
        ...DEFAULT_VOLUME_CONFIG,
        historySize: 20,
      });

      for (let i = 0; i < 30; i++) {
        customAnalyzer.update(1000 + i);
      }

      expect(customAnalyzer.getHistoryLength()).toBe(20);
      customAnalyzer.dispose();
    });

    it('should use custom whale interval', () => {
      const customAnalyzer = createVolumeAnalyzer({
        ...DEFAULT_VOLUME_CONFIG,
        minWhaleInterval: 10000, // 10 seconds
      });

      // Build history
      for (let i = 0; i < 10; i++) {
        customAnalyzer.update(1000 + i * 100);
      }

      const now = Date.now();
      customAnalyzer.recordWhaleSpawn(now);

      // 5 seconds later - should still be on cooldown
      expect(customAnalyzer.isOnCooldown(now + 5000)).toBe(true);

      // 11 seconds later - should not be on cooldown
      expect(customAnalyzer.isOnCooldown(now + 11000)).toBe(false);

      customAnalyzer.dispose();
    });

    it('should make defensive copy of config', () => {
      const config = { ...DEFAULT_VOLUME_CONFIG };
      const customAnalyzer = createVolumeAnalyzer(config);

      // Mutating original config should not affect analyzer
      config.historySize = 5;

      for (let i = 0; i < 50; i++) {
        customAnalyzer.update(1000 + i);
      }

      // Should use original historySize (100)
      expect(customAnalyzer.getHistoryLength()).toBe(50);
      customAnalyzer.dispose();
    });
  });
});
