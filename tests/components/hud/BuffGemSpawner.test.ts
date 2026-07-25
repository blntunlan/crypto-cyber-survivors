import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BuffGemSpawner } from '../../../services/spawners/BuffGemSpawner';

describe('BuffGemSpawner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    BuffGemSpawner.reset();
    BuffGemSpawner.configure({
      volatilityThreshold: 0.15,
      spawnCooldown: 3000,
      maxActiveGems: 3,
      gemLifetime: 5000,
      gemRadius: 20,
      debuffChance: 0.1,
    });
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
      BuffGemSpawner.update(1.0, 11000);

      BuffGemSpawner.update(1.2, 0);

      expect(BuffGemSpawner.getActiveGems().length).toBeGreaterThan(0);
    });

    it('does not advance the grace period from wall-clock time', () => {
      vi.advanceTimersByTime(11000);
      BuffGemSpawner.update(2.0, 0);

      expect(BuffGemSpawner.getActiveGems()).toHaveLength(0);

      BuffGemSpawner.update(1.0, 10000);
      BuffGemSpawner.update(1.2, 0);

      expect(BuffGemSpawner.getActiveGems()).toHaveLength(1);
    });

    it('should respect maxActiveGems limit', () => {
      BuffGemSpawner.configure({ maxActiveGems: 1, spawnCooldown: 0 });

      BuffGemSpawner.update(1.0, 11000);
      BuffGemSpawner.update(1.5, 100); // Trigger 1
      BuffGemSpawner.update(2.0, 100); // Trigger 2 (should be blocked)

      expect(BuffGemSpawner.getActiveGems()).toHaveLength(1);
    });

    it('should force spawn negative category gems only from debuff pool', () => {
      const gem = BuffGemSpawner.forceSpawnAt(120, 140, 'negative');

      expect(gem).not.toBeNull();
      expect(['slow', 'vulnerable']).toContain(gem?.buffType);
      expect(gem).toEqual(expect.objectContaining({ x: 120, y: 140, active: true }));
    });

    it('should recycle expired gems with the next spawn properties', () => {
      const firstGem = BuffGemSpawner.spawnGem('rage', 10, 10);
      firstGem.elapsedLifetime = firstGem.lifetime;

      BuffGemSpawner.update(1, 1);

      const recycledGem = BuffGemSpawner.spawnGem('vulnerable', 30, 40);
      expect(recycledGem).toBe(firstGem);
      expect(recycledGem).toMatchObject({
        active: true,
        x: 30,
        y: 40,
        buffType: 'vulnerable',
        elapsedLifetime: 0,
        pulsePhase: 0,
      });
    });
  });

  describe('Permanent Buff Protection', () => {
    it('should not spawn permanent buffs again once collected', () => {
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
