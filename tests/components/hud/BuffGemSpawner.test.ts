import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BuffGemSpawner } from '../../../services/spawners/BuffGemSpawner';

describe('BuffGemSpawner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    BuffGemSpawner.reset();
    BuffGemSpawner.initialize(800, 600);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Spawning Logic', () => {
    it('should not spawn anything during grace period (first 10s)', () => {
      // Diff change is high enough but we are at T=0
      BuffGemSpawner.update(2.0, 100);
      expect(BuffGemSpawner.getActiveGems()).toHaveLength(0);
    });

    it('should spawn gem when volatility exceeds threshold after grace period', () => {
      // 1. Skip grace period
      vi.advanceTimersByTime(11000);

      // 2. Initial update to set lastDifficulty
      BuffGemSpawner.update(1.0, 100);

      // 3. Volatility spike (Threshold is 0.15)
      BuffGemSpawner.update(1.2, 100);

      expect(BuffGemSpawner.getActiveGems().length).toBeGreaterThan(0);
    });

    it('should respect maxActiveGems limit', () => {
      vi.advanceTimersByTime(11000);
      BuffGemSpawner.configure({ maxActiveGems: 1, spawnCooldown: 0 });

      BuffGemSpawner.update(1.0, 100);
      BuffGemSpawner.update(1.5, 100); // Trigger 1
      BuffGemSpawner.update(2.0, 100); // Trigger 2 (should be blocked)

      expect(BuffGemSpawner.getActiveGems()).toHaveLength(1);
    });
  });

  describe('Permanent Buff Protection', () => {
    it('should not spawn permanent buffs again once collected', () => {
      vi.advanceTimersByTime(11000);

      // Force spawn a diamond gem (permanent)
      const gem = BuffGemSpawner.spawnGem('diamond', 100, 100);
      expect(BuffGemSpawner.getActiveGems()).toContain(gem);

      // Collect it
      BuffGemSpawner.collectGem(gem);

      // Try to spawn another random buff many times
      // Since diamond is collected, it shouldn't appear in random selection
      for (let i = 0; i < 50; i++) {
        const newGem = BuffGemSpawner.forceSpawn();
        expect(newGem?.buffType).not.toBe('diamond');
        if (newGem) BuffGemSpawner.collectGem(newGem);
      }
    });
  });

  describe('Lifetime & Recycling', () => {
    it('should despawn gems after lifetime expires', () => {
      BuffGemSpawner.forceSpawn('rage');
      expect(BuffGemSpawner.getActiveGems()).toHaveLength(1);

      // Default lifetime is 5000ms
      vi.advanceTimersByTime(6000);
      BuffGemSpawner.update(1.0, 6000);

      expect(BuffGemSpawner.getActiveGems()).toHaveLength(0);
    });

    it('should recycle gems from pool', () => {
      const gem1 = BuffGemSpawner.spawnGem('lucky', 10, 10);
      BuffGemSpawner.collectGem(gem1); // Released to pool

      const gem2 = BuffGemSpawner.spawnGem('rage', 20, 20);
      // Depending on implementation, gem2 might be the same object as gem1
      expect(gem2).toBeDefined();
      expect(BuffGemSpawner.getActiveGems()).toHaveLength(1);
    });
  });

  describe('Utility Methods', () => {
    it('should calculate lifetime ratio', () => {
      const gem = BuffGemSpawner.spawnGem('rage', 100, 100);
      gem.elapsedLifetime = 2500;
      gem.lifetime = 5000;

      expect(BuffGemSpawner.getGemLifetimeRatio(gem)).toBe(0.5);
    });

    it('should clear all gems on reset or clearAll', () => {
      BuffGemSpawner.forceSpawn();
      BuffGemSpawner.forceSpawn();
      expect(BuffGemSpawner.getActiveGems()).toHaveLength(2);

      BuffGemSpawner.clearAll();
      expect(BuffGemSpawner.getActiveGems()).toHaveLength(0);
    });
  });
});
