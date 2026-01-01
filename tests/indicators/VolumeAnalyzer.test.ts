/**
 * Volume Analyzer Tests
 *
 * Tests the volume normalization and whale detection system.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
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
  });

  describe('Volume Normalization', () => {
    it('should return 0.5 when not enough data', () => {
      analyzer.update(1000);
      expect(analyzer.getNormalizedVolume()).toBe(0.5);
    });

    it('should normalize volume to 0-1 range', () => {
      // Build up history with varied volumes
      const volumes = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
      volumes.forEach(v => analyzer.update(v));

      // The last volume (1000) should be normalized to 1.0 (it's the max)
      expect(analyzer.getNormalizedVolume()).toBe(1);
    });

    it('should normalize minimum volume to 0', () => {
      // Build history
      const volumes = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
      volumes.forEach(v => analyzer.update(v));

      // Add min volume again
      analyzer.update(100);
      expect(analyzer.getNormalizedVolume()).toBe(0);
    });

    it('should normalize middle volume to ~0.5', () => {
      // Build history with 100-1000 range
      const volumes = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
      volumes.forEach(v => analyzer.update(v));

      // Add middle volume
      analyzer.update(550); // (550-100)/(1000-100) = 450/900 = 0.5
      expect(analyzer.getNormalizedVolume()).toBe(0.5);
    });

    it('should return 0.5 when all volumes are the same', () => {
      // All same volumes
      for (let i = 0; i < 10; i++) {
        analyzer.update(1000);
      }
      expect(analyzer.getNormalizedVolume()).toBe(0.5);
    });
  });

  describe('Whale Tier Detection', () => {
    it('should detect NONE tier for low normalized volume', () => {
      // Build history where current is below 0.3 threshold
      const volumes = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
      volumes.forEach(v => analyzer.update(v));

      // Add low volume (normalized < 0.3)
      analyzer.update(200); // (200-100)/(1000-100) = 0.111
      expect(analyzer.getWhaleTier()).toBe(WhaleTier.NONE);
    });

    it('should detect BABY_WHALE tier for volume 0.3-0.6', () => {
      const volumes = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
      volumes.forEach(v => analyzer.update(v));

      // Add volume that normalizes to ~0.4 (between 0.3 and 0.6)
      analyzer.update(460); // (460-100)/(1000-100) = 0.4
      expect(analyzer.getWhaleTier()).toBe(WhaleTier.BABY_WHALE);
    });

    it('should detect WHALE tier for volume 0.6-0.9', () => {
      const volumes = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
      volumes.forEach(v => analyzer.update(v));

      // Add volume that normalizes to ~0.75 (between 0.6 and 0.9)
      analyzer.update(775); // (775-100)/(1000-100) = 0.75
      expect(analyzer.getWhaleTier()).toBe(WhaleTier.WHALE);
    });

    it('should detect MEGA_WHALE tier for volume > 0.9', () => {
      const volumes = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
      volumes.forEach(v => analyzer.update(v));

      // Add max volume (normalized = 1.0 > 0.9)
      analyzer.update(1000);
      expect(analyzer.getWhaleTier()).toBe(WhaleTier.MEGA_WHALE);
    });

    it('should update tier correctly as volume changes', () => {
      const volumes = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
      volumes.forEach(v => analyzer.update(v));

      // Low volume → NONE
      analyzer.update(150);
      expect(analyzer.getWhaleTier()).toBe(WhaleTier.NONE);

      // Higher volume → tier changes
      analyzer.update(1000);
      expect(analyzer.getWhaleTier()).toBe(WhaleTier.MEGA_WHALE);
    });
  });

  describe('Whale Spawn Cooldown', () => {
    beforeEach(() => {
      // Build up history to enable whale spawning
      const volumes = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
      volumes.forEach(v => analyzer.update(v));
    });

    it('should not spawn whale when tier is NONE', () => {
      analyzer.update(100); // Low volume → NONE tier
      const result = analyzer.shouldSpawnWhale(Date.now());
      expect(result.shouldSpawn).toBe(false);
    });

    it('should not spawn whale when not initialized', () => {
      const freshAnalyzer = createVolumeAnalyzer();
      freshAnalyzer.update(1000); // Only 1 data point
      const result = freshAnalyzer.shouldSpawnWhale(Date.now());
      expect(result.shouldSpawn).toBe(false);
    });

    it('should respect cooldown between spawns', () => {
      // Set high volume for potential spawn
      analyzer.update(1000);

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
      analyzer.update(1000); // MEGA_WHALE tier
      const now = Date.now();

      // First, ensure we're not on cooldown and mock random to always succeed
      vi.spyOn(Math, 'random').mockReturnValue(0); // Always succeeds spawn check

      // Record a spawn
      analyzer.recordWhaleSpawn(now);

      // Within cooldown - should not spawn
      const result = analyzer.shouldSpawnWhale(now + 1000);
      expect(result.shouldSpawn).toBe(false);

      vi.restoreAllMocks();
    });

    it('should include tier config when spawn succeeds', () => {
      analyzer.update(1000); // MEGA_WHALE tier

      // Mock random to always succeed
      vi.spyOn(Math, 'random').mockReturnValue(0);

      const result = analyzer.shouldSpawnWhale(Date.now() + 10000);

      if (result.shouldSpawn) {
        expect(result.tier).toBe(WhaleTier.MEGA_WHALE);
        expect(result.config).toBeDefined();
        expect(result.config?.sizeMultiplier).toBe(2.0);
        expect(result.config?.healthMultiplier).toBe(4.0);
      }

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

    it('should handle volume spikes correctly', () => {
      // Normal volumes
      for (let i = 0; i < 10; i++) {
        analyzer.update(1000);
      }

      // Massive spike
      analyzer.update(100000);

      // Should normalize to 1 (max)
      expect(analyzer.getNormalizedVolume()).toBe(1);
      expect(analyzer.getWhaleTier()).toBe(WhaleTier.MEGA_WHALE);
    });
  });

  describe('Reset', () => {
    it('should reset all state', () => {
      // Build up state
      for (let i = 0; i < 10; i++) {
        analyzer.update(1000 + i * 100);
      }
      analyzer.recordWhaleSpawn(Date.now());

      expect(analyzer.getWhaleTier()).not.toBe(WhaleTier.NONE);
      expect(analyzer.getHistoryLength()).toBe(10);

      // Reset
      analyzer.reset();

      expect(analyzer.getNormalizedVolume()).toBe(0.5);
      expect(analyzer.getWhaleTier()).toBe(WhaleTier.NONE);
      expect(analyzer.getHistoryLength()).toBe(0);
      expect(analyzer.isInitialized()).toBe(false);
      expect(analyzer.isOnCooldown(Date.now())).toBe(false);
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
    });
  });
});
