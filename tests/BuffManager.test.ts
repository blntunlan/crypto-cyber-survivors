/**
 * BuffManager Tests
 *
 * Tests for the Decorator Pattern buff/debuff system.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BuffManager } from '../services/patterns/decorators/BuffManager';
import { type IPlayerStats } from '../services/patterns/decorators/IPlayerStats';
import {
  RageModeDecorator,
  DiamondHandsDecorator,
  BerserkDecorator,
  LuckBoostDecorator,
  SlowDecorator,
  VulnerableDecorator,
  LiquidatedDecorator,
  WeakenedDecorator,
} from '../services/patterns/decorators';
import { type Player } from '../types';

// Mock player for testing
const createMockPlayer = (): Player => ({
  x: 100,
  y: 100,
  radius: 16,
  color: '#00FF00',
  hp: 100,
  maxHp: 100,
  level: 1,
  exp: 0,
  nextLevelExp: 100,
  speed: 5,
  fireRate: 200,
  critChance: 0.1,
  baseDamage: 10,
  luck: 1,
  lifesteal: 0,
  dodge: 0,
  magnet: 100,
  armor: 5,
  area: 1,
  projectiles: 1,
});

describe('BuffManager', () => {
  beforeEach(() => {
    BuffManager.reset();
  });

  describe('initialization', () => {
    it('should initialize with a player', () => {
      const player = createMockPlayer();
      BuffManager.initialize(player);

      expect(BuffManager.isInitialized()).toBe(true);
    });

    it('should return base stats when no effects are applied', () => {
      const player = createMockPlayer();
      BuffManager.initialize(player);

      const stats = BuffManager.getDecoratedStats();

      expect(stats.getDamage()).toBe(10);
      expect(stats.getSpeed()).toBe(5);
      expect(stats.getArmor()).toBe(5);
    });

    it('should throw error when getting stats without initialization', () => {
      expect(() => BuffManager.getDecoratedStats()).toThrow();
    });
  });

  describe('buff application', () => {
    beforeEach(() => {
      BuffManager.initialize(createMockPlayer());
    });

    it('should apply RageMode buff correctly', () => {
      BuffManager.addBuff(RageModeDecorator);

      const stats = BuffManager.getDecoratedStats();

      expect(stats.getDamage()).toBe(15); // 10 * 1.5
      expect(stats.getSpeed()).toBe(6); // 5 * 1.2
    });

    it('should apply DiamondHands buff correctly', () => {
      BuffManager.addBuff(DiamondHandsDecorator);

      const stats = BuffManager.getDecoratedStats();

      expect(stats.getArmor()).toBe(10); // 5 + 5
      expect(stats.getCritChance()).toBe(0.2); // 0.1 + 0.1
    });

    it('should apply Berserk buff correctly', () => {
      BuffManager.addBuff(BerserkDecorator);

      const stats = BuffManager.getDecoratedStats();

      expect(stats.getDamage()).toBe(20); // 10 * 2.0
      // Fire rate is delay in ms, so 0.67x = faster attacks
      expect(stats.getFireRate()).toBe(200 * 0.67); // 200 * 0.67 = 134
      expect(stats.getArmor()).toBe(3.5); // 5 * 0.7
    });

    it('should apply LuckBoost buff correctly', () => {
      BuffManager.addBuff(LuckBoostDecorator);

      const stats = BuffManager.getDecoratedStats();

      expect(stats.getLuck()).toBe(3); // 1 + 2 (additive)
      expect(stats.getMagnet()).toBe(150); // 100 + 50 (additive)
    });
  });

  describe('debuff application', () => {
    beforeEach(() => {
      BuffManager.initialize(createMockPlayer());
    });

    it('should apply Slow debuff correctly', () => {
      BuffManager.addDebuff(SlowDecorator);

      const stats = BuffManager.getDecoratedStats();

      expect(stats.getSpeed()).toBe(2.5); // 5 * 0.5
    });

    it('should apply Vulnerable debuff correctly', () => {
      BuffManager.addDebuff(VulnerableDecorator);

      const stats = BuffManager.getDecoratedStats();

      expect(stats.getArmor()).toBe(2.5); // 5 * 0.5
    });

    it('should apply Liquidated debuff correctly', () => {
      BuffManager.addDebuff(LiquidatedDecorator);

      const stats = BuffManager.getDecoratedStats();

      expect(stats.getDamage()).toBe(5); // 10 * 0.5
      expect(stats.getFireRate()).toBe(140); // 200 * 0.7
      expect(stats.getCritChance()).toBe(0.05); // 0.1 * 0.5
    });

    it('should apply Weakened debuff correctly', () => {
      BuffManager.addDebuff(WeakenedDecorator);

      const stats = BuffManager.getDecoratedStats();

      expect(stats.getDamage()).toBe(7); // 10 * 0.7
      expect(stats.getLuck()).toBe(0.6); // 1 * 0.6
    });
  });

  describe('stacking effects', () => {
    beforeEach(() => {
      BuffManager.initialize(createMockPlayer());
    });

    it('should stack multiple buffs correctly', () => {
      BuffManager.addBuff(RageModeDecorator); // +50% damage
      BuffManager.addBuff(BerserkDecorator); // +100% damage

      const stats = BuffManager.getDecoratedStats();

      // Damage: 10 * 1.5 * 2.0 = 30
      expect(stats.getDamage()).toBe(30);
    });

    it('should stack buff and debuff correctly', () => {
      BuffManager.addBuff(RageModeDecorator); // +50% damage
      BuffManager.addDebuff(LiquidatedDecorator); // -50% damage

      const stats = BuffManager.getDecoratedStats();

      // Damage: 10 * 1.5 * 0.5 = 7.5
      expect(stats.getDamage()).toBe(7.5);
    });

    it('should handle multiple debuffs stacking', () => {
      BuffManager.addDebuff(SlowDecorator); // -50% speed
      BuffManager.addDebuff(VulnerableDecorator); // -50% armor

      const stats = BuffManager.getDecoratedStats();

      expect(stats.getSpeed()).toBe(2.5);
      expect(stats.getArmor()).toBe(2.5);
    });
  });

  describe('effect management', () => {
    beforeEach(() => {
      BuffManager.initialize(createMockPlayer());
    });

    it('should return effect ID when adding', () => {
      const id = BuffManager.addBuff(RageModeDecorator);

      expect(id).toBeTruthy();
      expect(id).toContain('effect_');
    });

    it('should remove effect by ID', () => {
      const id = BuffManager.addBuff(RageModeDecorator);

      expect(BuffManager.hasEffect('Rage Mode')).toBe(true);

      BuffManager.removeEffectById(id);

      expect(BuffManager.hasEffect('Rage Mode')).toBe(false);
    });

    it('should remove effect by name', () => {
      BuffManager.addBuff(RageModeDecorator);

      const removed = BuffManager.removeEffectByName('Rage Mode');

      expect(removed).toBe(1);
      expect(BuffManager.hasEffect('Rage Mode')).toBe(false);
    });

    it('should extend duration when adding same temporary buff', () => {
      vi.useFakeTimers();
      BuffManager.addBuff(RageModeDecorator); // 10 second duration

      vi.advanceTimersByTime(5000); // 5 seconds passed, 5s remaining

      // Add same buff again
      BuffManager.addBuff(RageModeDecorator);

      // Should still only have 1 effect
      expect(BuffManager.getActiveEffects()).toHaveLength(1);

      // Should have ~15 seconds remaining (5s + 10s)
      const effects = BuffManager.getActiveEffects();
      expect(effects[0]?.remainingMs).toBeGreaterThan(14500);
      expect(effects[0]?.remainingMs).toBeLessThanOrEqual(15000);

      vi.useRealTimers();
    });

    it('should not stack permanent effects', () => {
      BuffManager.addBuff(DiamondHandsDecorator); // Permanent
      BuffManager.addBuff(DiamondHandsDecorator); // Try to add again

      // Should still only have 1 effect
      expect(BuffManager.getActiveEffects()).toHaveLength(1);
    });

    it('should check if effect exists', () => {
      expect(BuffManager.hasEffect('Rage Mode')).toBe(false);

      BuffManager.addBuff(RageModeDecorator);

      expect(BuffManager.hasEffect('Rage Mode')).toBe(true);
    });

    it('should get active effects list', () => {
      BuffManager.addBuff(RageModeDecorator);
      BuffManager.addBuff(DiamondHandsDecorator);

      const effects = BuffManager.getActiveEffects();

      expect(effects).toHaveLength(2);
      expect(effects[0]?.name).toBe('Rage Mode');
      expect(effects[1]?.name).toBe('Diamond Hands');
    });

    it('should clear all effects', () => {
      BuffManager.addBuff(RageModeDecorator);
      BuffManager.addBuff(DiamondHandsDecorator);

      BuffManager.clearAll();

      expect(BuffManager.getActiveEffects()).toHaveLength(0);
    });

    it('should clear only temporary effects', () => {
      BuffManager.addBuff(RageModeDecorator); // Temporary (10s)
      BuffManager.addBuff(DiamondHandsDecorator); // Permanent

      BuffManager.clearTemporary();

      const effects = BuffManager.getActiveEffects();
      expect(effects).toHaveLength(1);
      expect(effects[0]?.name).toBe('Diamond Hands');
    });
  });

  describe('effect expiration', () => {
    beforeEach(() => {
      BuffManager.initialize(createMockPlayer());
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should expire temporary effects after duration', () => {
      BuffManager.addBuff(RageModeDecorator); // 10 second duration

      expect(BuffManager.hasEffect('Rage Mode')).toBe(true);

      // Advance time by 11 seconds
      vi.advanceTimersByTime(11000);
      BuffManager.update();

      expect(BuffManager.hasEffect('Rage Mode')).toBe(false);
    });

    it('should not expire permanent effects', () => {
      BuffManager.addBuff(DiamondHandsDecorator); // Permanent (-1)

      // Advance time by 1 hour
      vi.advanceTimersByTime(3600000);
      BuffManager.update();

      expect(BuffManager.hasEffect('Diamond Hands')).toBe(true);
    });

    it('should track remaining time for effects', () => {
      BuffManager.addBuff(RageModeDecorator); // 10 second duration

      vi.advanceTimersByTime(5000); // 5 seconds passed

      const effects = BuffManager.getActiveEffects();
      const rageEffect = effects.find(e => e.name === 'Rage Mode');

      // Should have ~5000ms remaining (with some tolerance for timing)
      expect(rageEffect?.remainingMs).toBeLessThanOrEqual(5000);
      expect(rageEffect?.remainingMs).toBeGreaterThan(4900);
    });
  });

  describe('pause and resume', () => {
    beforeEach(() => {
      BuffManager.initialize(createMockPlayer());
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should pause effect timers', () => {
      BuffManager.addBuff(RageModeDecorator); // 10 second duration

      expect(BuffManager.isPaused()).toBe(false);

      BuffManager.pause();

      expect(BuffManager.isPaused()).toBe(true);
    });

    it('should freeze remaining time when paused', () => {
      BuffManager.addBuff(RageModeDecorator); // 10 second duration

      vi.advanceTimersByTime(3000); // 3 seconds passed
      BuffManager.pause();

      const effectsBeforeWait = BuffManager.getActiveEffects();
      const remainingBefore = effectsBeforeWait.find(e => e.name === 'Rage Mode')?.remainingMs;

      // Advance time while paused
      vi.advanceTimersByTime(5000);

      const effectsAfterWait = BuffManager.getActiveEffects();
      const remainingAfter = effectsAfterWait.find(e => e.name === 'Rage Mode')?.remainingMs;

      // Remaining time should be the same since we're paused
      expect(remainingAfter).toBe(remainingBefore);
    });

    it('should not expire effects while paused', () => {
      BuffManager.addBuff(RageModeDecorator); // 10 second duration

      vi.advanceTimersByTime(5000); // 5 seconds passed
      BuffManager.pause();

      // Advance time well past expiration
      vi.advanceTimersByTime(20000);
      BuffManager.update(); // Should do nothing while paused

      expect(BuffManager.hasEffect('Rage Mode')).toBe(true);
    });

    it('should resume and continue countdown', () => {
      BuffManager.addBuff(RageModeDecorator); // 10 second duration

      vi.advanceTimersByTime(5000); // 5 seconds passed (5s remaining)
      BuffManager.pause();

      vi.advanceTimersByTime(10000); // 10 seconds while paused (ignored)
      BuffManager.resume();

      // Should still have ~5 seconds remaining after resume
      const effects = BuffManager.getActiveEffects();
      const rageEffect = effects.find(e => e.name === 'Rage Mode');
      expect(rageEffect?.remainingMs).toBeLessThanOrEqual(5000);
      expect(rageEffect?.remainingMs).toBeGreaterThan(4500);

      // Now advance 3 more seconds
      vi.advanceTimersByTime(3000);
      BuffManager.update();

      // Should still exist (2s remaining)
      expect(BuffManager.hasEffect('Rage Mode')).toBe(true);

      // Advance 3 more seconds
      vi.advanceTimersByTime(3000);
      BuffManager.update();

      // Should be expired now
      expect(BuffManager.hasEffect('Rage Mode')).toBe(false);
    });

    it('should not affect permanent effects on pause/resume', () => {
      BuffManager.addBuff(DiamondHandsDecorator); // Permanent

      BuffManager.pause();
      vi.advanceTimersByTime(100000);
      BuffManager.resume();

      expect(BuffManager.hasEffect('Diamond Hands')).toBe(true);
    });
  });
});

describe('Individual Decorators', () => {
  it('RageModeDecorator should have correct metadata', () => {
    const mockStats: IPlayerStats = {
      getDamage: () => 10,
      getSpeed: () => 5,
      getFireRate: () => 200,
      getCritChance: () => 0.1,
      getCritDamage: () => 0.2,
      getArmor: () => 5,
      getMagnet: () => 100,
      getProjectiles: () => 1,
      getArea: () => 1,
      getLuck: () => 1,
      getLifesteal: () => 0,
      getDodge: () => 0,
    };

    const decorator = new RageModeDecorator(mockStats);

    expect(decorator.getName()).toBe('Rage Mode');
    expect(decorator.getIcon()).toBe('🔥');
    expect(decorator.getDuration()).toBe(10000);
    expect(decorator.getDescription()).toContain('+50% damage');
  });

  it('DiamondHandsDecorator should be permanent', () => {
    const mockStats: IPlayerStats = {
      getDamage: () => 10,
      getSpeed: () => 5,
      getFireRate: () => 200,
      getCritChance: () => 0.1,
      getCritDamage: () => 0.2,
      getArmor: () => 5,
      getMagnet: () => 100,
      getProjectiles: () => 1,
      getArea: () => 1,
      getLuck: () => 1,
      getLifesteal: () => 0,
      getDodge: () => 0,
    };

    const decorator = new DiamondHandsDecorator(mockStats);

    expect(decorator.getDuration()).toBe(-1);
  });
});
