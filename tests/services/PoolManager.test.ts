/**
 * PoolManager Tests
 *
 * Tests for object pooling, retrieval, and cleanup.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PoolManager } from '../../services/combat/PoolManager';
import { ResetOrchestrator } from '../../services/core/ResetOrchestrator';
import { MarketPosition } from '../../types';
import { WhaleTier } from '../../types/indicators';

describe('PoolManager', () => {
  let pool: PoolManager;

  beforeEach(() => {
    pool = PoolManager.getInstance();
    pool.clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('preWarm', () => {
    it('should pre-populate pools', () => {
      pool.preWarm({ enemies: 10, bullets: 20 });
      expect(pool).toBeDefined();
    });
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
      const bullet1 = pool.getBullet(0, 0, 1, 1, 10, 4, '#fff', false, false);
      bullet1.active = false;
      pool.cleanup();
      expect(pool.activeBullets.length).toBe(0);

      const bullet2 = pool.getBullet(50, 50, 2, 2, 20, 5, '#000', true, false);
      expect(pool.activeBullets.length).toBe(1);
      expect(bullet2.x).toBe(50);
      expect(bullet2.damage).toBe(20);
    });
  });

  describe('getLootCache', () => {
    it('initializes the pooled Market Cache contract', () => {
      const cache = pool.getLootCache(7, 'epic', 'runtime', 120, 240, '#a855f7');

      expect(cache).toMatchObject({
        active: true,
        type: 'LOOT_CRATE',
        x: 120,
        y: 240,
        radius: 20,
        color: '#a855f7',
        health: 1,
        maxHealth: 1,
        lootCacheId: 7,
        lootCacheRarity: 'epic',
        lootCachePhase: 'closed',
        lootCacheSource: 'runtime',
        lootCachePhaseElapsedMs: 0,
        lootCacheIdleElapsedMs: 0,
        lootCacheProximity: false,
        lootCacheProximityTickElapsedMs: 0,
        lootCacheCoreFlashPending: false,
        lootCacheSecondaryReward: null,
        lootCacheFragmentPreview: false,
      });
      expect(cache.lootCachePrimaryReward).toBeUndefined();
    });

    it('clears prior cache state when reusing an interactable', () => {
      const firstCache = pool.getLootCache(1, 'legendary', 'debug', 20, 30, '#fbbf24');
      firstCache.lootCachePhase = 'reward';
      firstCache.lootCachePhaseElapsedMs = 640;
      firstCache.lootCacheIdleElapsedMs = 123;
      firstCache.lootCacheProximity = true;
      firstCache.lootCacheProximityTickElapsedMs = 99;
      firstCache.lootCacheCoreFlashPending = true;
      firstCache.lootCachePrimaryReward = 'data_dividend';
      firstCache.lootCacheSecondaryReward = 'circuit_breaker';
      firstCache.lootCacheFragmentPreview = true;

      pool.releaseInteractable(firstCache);
      const reusedCache = pool.getLootCache(2, 'rare', 'runtime', 80, 90, '#00d4ff');

      expect(reusedCache).toBe(firstCache);
      expect(reusedCache).toMatchObject({
        active: true,
        type: 'LOOT_CRATE',
        x: 80,
        y: 90,
        radius: 20,
        color: '#00d4ff',
        health: 1,
        maxHealth: 1,
        isHit: false,
        hitTimer: 0,
        lootCacheId: 2,
        lootCacheRarity: 'rare',
        lootCachePhase: 'closed',
        lootCacheSource: 'runtime',
        lootCachePhaseElapsedMs: 0,
        lootCacheIdleElapsedMs: 0,
        lootCacheProximity: false,
        lootCacheProximityTickElapsedMs: 0,
        lootCacheCoreFlashPending: false,
        lootCacheSecondaryReward: null,
        lootCacheFragmentPreview: false,
      });
      expect(reusedCache.lootCachePrimaryReward).toBeUndefined();
    });
  });

  describe('getFloatingText', () => {
    it('clears cache reveal presentation state when reusing pooled text', () => {
      const firstText = pool.getFloatingText(10, 20, 'FIRST', '#fff', 18);
      firstText.stationary = true;
      firstText.alwaysVisible = true;
      firstText.velocityOnly = true;

      pool.releaseFloatingText(firstText);
      const reusedText = pool.getFloatingText(30, 40, 'SECOND', '#0ff', 14);

      expect(reusedText).toBe(firstText);
      expect(reusedText.stationary).toBe(false);
      expect(reusedText.alwaysVisible).toBe(false);
      expect(reusedText.velocityOnly).toBe(false);
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

    it('should clear transient hit feedback when reusing enemies', () => {
      const enemy1 = pool.getEnemy(0, 0, 1, MarketPosition.LONG);
      enemy1.hitImpactTimer = 1;
      enemy1.hitRecoilX = 5;
      enemy1.hitRecoilY = -2;
      enemy1.active = false;
      pool.cleanup();

      const enemy2 = pool.getEnemy(10, 20, 1, MarketPosition.LONG);

      expect(enemy2.hitImpactTimer).toBe(0);
      expect(enemy2.hitRecoilX).toBe(0);
      expect(enemy2.hitRecoilY).toBe(0);
    });

    it('should clear movement slow state when reusing enemies', () => {
      const enemy1 = pool.getEnemy(0, 0, 1, MarketPosition.LONG);
      enemy1.movementSlowTimerMs = 2500;
      enemy1.movementSlowMultiplier = 0.5;

      pool.releaseEnemy(enemy1);
      const enemy2 = pool.getEnemy(10, 20, 1, MarketPosition.LONG);

      expect(enemy2).toBe(enemy1);
      expect(enemy2.movementSlowTimerMs).toBe(0);
      expect(enemy2.movementSlowMultiplier).toBe(1);
    });

    it('should create a whale enemy with tier multipliers', () => {
      const whale = pool.getWhaleEnemy(
        100,
        200,
        1,
        MarketPosition.LONG,
        WhaleTier.MEGA_WHALE
      );

      expect(whale).toBeDefined();
      expect(whale.x).toBe(100);
      expect(whale.radius).toBeGreaterThan(20);
      expect(whale.active).toBe(true);
      expect(pool.activeEnemies.length).toBe(1);
    });

    it('should apply dynamic response metadata and HP scaling', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      const enemy = pool.getEnemy(
        0,
        0,
        1,
        MarketPosition.LONG,
        'mev_bot',
        undefined,
        1,
        1,
        undefined,
        1.5,
        'ranged',
        2
      );

      expect(enemy.health).toBe(25 * 1.5);
      expect(enemy.maxHealth).toBe(enemy.health);
      expect(enemy.intent).toBe('ranged');
      expect(enemy.combatRole).toBe('ranged');
      expect(enemy.powerTier).toBe(2);
      expect(enemy.canShoot).toBe(false);
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

  describe('getImpactRing', () => {
    it('should create an impact ring with correct properties', () => {
      const ring = pool.getImpactRing(100, 120, 8, 40, '#00ffff', 3);

      expect(ring.x).toBe(100);
      expect(ring.y).toBe(120);
      expect(ring.radius).toBe(8);
      expect(ring.startRadius).toBe(8);
      expect(ring.maxRadius).toBe(40);
      expect(ring.color).toBe('#00ffff');
      expect(ring.lineWidth).toBe(3);
      expect(ring.life).toBe(1);
      expect(ring.active).toBe(true);
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
      const bullet = pool.getBullet(0, 0, 1, 1, 10, 4, '#fff', false, false);
      const gem = pool.getGem(0, 0, 10, 5, '#ffd700', false);

      expect(pool.activeBullets.length).toBe(1);
      expect(pool.activeGems.length).toBe(1);

      bullet.active = false;
      gem.active = false;

      pool.cleanup();

      expect(pool.activeBullets.length).toBe(0);
      expect(pool.activeGems.length).toBe(0);
    });

    it('should keep active objects in active lists', () => {
      pool.getBullet(0, 0, 1, 1, 10, 4, '#fff', false, false);
      pool.getBullet(10, 10, 1, 1, 10, 4, '#fff', false, false);
      pool.activeBullets[0]!.active = false;
      pool.cleanup();
      expect(pool.activeBullets.length).toBe(1);
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

    it('clears active pools through ResetOrchestrator without GameEngine mount', () => {
      pool.getBullet(0, 0, 1, 1, 10, 4, '#fff', false, false);
      pool.getEnemy(0, 0, 1, MarketPosition.LONG);

      expect(pool.activeBullets.length).toBe(1);
      expect(pool.activeEnemies.length).toBe(1);

      ResetOrchestrator.orchestrateReset();

      expect(pool.activeBullets.length).toBe(0);
      expect(pool.activeEnemies.length).toBe(0);
    });
  });
});
