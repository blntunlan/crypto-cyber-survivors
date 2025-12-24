/**
 * PoolManager Tests
 *
 * Tests for object pooling, retrieval, and cleanup.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PoolManager } from '../services/PoolManager';
import { MarketPosition } from '../types';

describe('PoolManager', () => {
  let pool: PoolManager;

  beforeEach(() => {
    pool = new PoolManager();
  });

  describe('getBullet', () => {
    it('should create a new bullet', () => {
      const bullet = pool.getBullet(100, 200, 5, 0, 25, 4, '#fff', false, false);

      expect(bullet).toBeDefined();
      expect(bullet.x).toBe(100);
      expect(bullet.y).toBe(200);
      expect(bullet.vx).toBe(5);
      expect(bullet.vy).toBe(0);
      expect(bullet.damage).toBe(25);
      expect(bullet.active).toBe(true);
    });

    it('should add bullet to activeBullets', () => {
      expect(pool.activeBullets.length).toBe(0);

      pool.getBullet(0, 0, 1, 1, 10, 4, '#fff', false, false);

      expect(pool.activeBullets.length).toBe(1);
    });

    it('should reuse inactive bullets from free list', () => {
      // Create a bullet
      const bullet1 = pool.getBullet(0, 0, 1, 1, 10, 4, '#fff', false, false);
      bullet1.active = false;

      // Cleanup moves it to free list
      pool.cleanup();

      expect(pool.activeBullets.length).toBe(0);

      // Get another bullet - should reuse
      const bullet2 = pool.getBullet(50, 50, 2, 2, 20, 5, '#000', true, false);

      expect(pool.activeBullets.length).toBe(1);
      expect(bullet2.x).toBe(50);
      expect(bullet2.damage).toBe(20);
    });
  });

  describe('getEnemy', () => {
    it('should create a new enemy', () => {
      const enemy = pool.getEnemy(100, 200, 1.5, MarketPosition.LONG);

      expect(enemy).toBeDefined();
      expect(enemy.x).toBe(100);
      expect(enemy.y).toBe(200);
      expect(enemy.active).toBe(true);
    });

    it('should add enemy to activeEnemies', () => {
      expect(pool.activeEnemies.length).toBe(0);

      pool.getEnemy(0, 0, 1, MarketPosition.LONG);

      expect(pool.activeEnemies.length).toBe(1);
    });
  });

  describe('getGem', () => {
    it('should create a gem with correct properties', () => {
      const gem = pool.getGem(50, 50, 100, 8, '#ffd700', true);

      expect(gem.x).toBe(50);
      expect(gem.y).toBe(50);
      expect(gem.value).toBe(100);
      expect(gem.radius).toBe(8);
      expect(gem.isRare).toBe(true);
      expect(gem.active).toBe(true);
    });
  });

  describe('getParticle', () => {
    it('should create a particle with life = 1', () => {
      const particle = pool.getParticle(100, 100, 2, -2, '#ff0000');

      expect(particle.x).toBe(100);
      expect(particle.life).toBe(1);
      expect(particle.active).toBe(true);
    });
  });

  describe('getFloatingText', () => {
    it('should create floating text with correct properties', () => {
      const text = pool.getFloatingText(200, 150, '999', '#ffd700', 24);

      expect(text.x).toBe(200);
      expect(text.y).toBe(150);
      expect(text.text).toBe('999');
      expect(text.size).toBe(24);
      expect(text.life).toBe(1);
    });
  });

  describe('cleanup', () => {
    it('should move inactive objects to free lists', () => {
      // Create some objects
      const bullet = pool.getBullet(0, 0, 1, 1, 10, 4, '#fff', false, false);
      const gem = pool.getGem(0, 0, 10, 5, '#ffd700', false);

      expect(pool.activeBullets.length).toBe(1);
      expect(pool.activeGems.length).toBe(1);

      // Mark as inactive
      bullet.active = false;
      gem.active = false;

      // Cleanup
      pool.cleanup();

      expect(pool.activeBullets.length).toBe(0);
      expect(pool.activeGems.length).toBe(0);
    });

    it('should keep active objects in active lists', () => {
      pool.getBullet(0, 0, 1, 1, 10, 4, '#fff', false, false);
      pool.getBullet(10, 10, 1, 1, 10, 4, '#fff', false, false);

      pool.activeBullets[0]!.active = false; // First inactive

      pool.cleanup();

      expect(pool.activeBullets.length).toBe(1); // Only second remains
    });
  });

  describe('clearAll', () => {
    it('should clear all active objects', () => {
      pool.getBullet(0, 0, 1, 1, 10, 4, '#fff', false, false);
      pool.getEnemy(0, 0, 1, MarketPosition.LONG);
      pool.getGem(0, 0, 10, 5, '#ffd700', false);

      expect(pool.activeBullets.length).toBe(1);
      expect(pool.activeEnemies.length).toBe(1);
      expect(pool.activeGems.length).toBe(1);

      pool.clearAll();

      expect(pool.activeBullets.length).toBe(0);
      expect(pool.activeEnemies.length).toBe(0);
      expect(pool.activeGems.length).toBe(0);
    });
  });
});
