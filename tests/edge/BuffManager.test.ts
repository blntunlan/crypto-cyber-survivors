import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BuffManager } from '../../services/patterns/decorators/BuffManager';
import { type Player } from '../../types';
import {
  RageModeDecorator,
  DiamondHandsDecorator,
} from '../../services/patterns/decorators';

describe('BuffManager Edge Cases', () => {
  let mockPlayer: Player;

  beforeEach(() => {
    BuffManager.reset();
    mockPlayer = {
      x: 0,
      y: 0,
      radius: 10,
      hp: 100,
      maxHp: 100,
      exp: 0,
      nextLevelExp: 100,
      level: 1,
      armor: 0,
      magnet: 0,
      speed: 4,
      fireRate: 300,
      baseDamage: 10,
      luck: 0,
      critChance: 0,
      projectiles: 1,
      area: 1,
      color: '#fff',
    } as any;
    BuffManager.initialize(mockPlayer);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Stacking and Repetitive Application', () => {
    it('should extend duration when adding same timed buff twice', () => {
      // RageMode is timed (usually 5-10s)
      BuffManager.addEffect(RageModeDecorator);
      const effects1 = BuffManager.getActiveEffects();
      const initialDuration = effects1[0]!.remainingMs;

      // Advance half time
      vi.advanceTimersByTime(initialDuration / 2);

      // Add again
      BuffManager.addEffect(RageModeDecorator);
      const effects2 = BuffManager.getActiveEffects();

      // Should be extended
      expect(effects2[0]!.remainingMs).toBeGreaterThan(initialDuration / 2);
      expect(effects2).toHaveLength(1); // Should not duplicate
    });

    it('should not stack or extend permanent buffs', () => {
      // DiamondHands is permanent (duration -1)
      BuffManager.addEffect(DiamondHandsDecorator);
      const effects1 = BuffManager.getActiveEffects();
      expect(effects1[0]!.isPermanent).toBe(true);

      BuffManager.addEffect(DiamondHandsDecorator);
      const effects2 = BuffManager.getActiveEffects();

      expect(effects2).toHaveLength(1);
    });
  });

  describe('Pause/Resume Boundary Conditions', () => {
    it('should correctly freeze timers during pause', () => {
      BuffManager.addEffect(RageModeDecorator);
      const initialRemaining = BuffManager.getActiveEffects()[0]!.remainingMs;

      BuffManager.pause();
      vi.advanceTimersByTime(5000); // 5 seconds pass in real time

      BuffManager.resume();
      const afterRemaining = BuffManager.getActiveEffects()[0]!.remainingMs;

      // Remaining time should be roughly the same as before pause
      expect(afterRemaining).toBeCloseTo(initialRemaining, -1);
    });

    it('should expire buffs immediately after pause if time ran out', () => {
      BuffManager.addEffect(RageModeDecorator);
      const initialRemaining = BuffManager.getActiveEffects()[0]!.remainingMs;

      // Advance almost to expiration
      vi.advanceTimersByTime(initialRemaining - 100);

      BuffManager.update();
      expect(BuffManager.getActiveEffects()).toHaveLength(1);

      // Let those 100ms pass
      vi.advanceTimersByTime(200);
      BuffManager.update();

      expect(BuffManager.getActiveEffects()).toHaveLength(0);
    });
  });

  describe('Multiple Different Buffs', () => {
    it('should maintain order and calculate stats correctly', () => {
      BuffManager.addEffect(RageModeDecorator); // Usually adds speed/damage
      BuffManager.addEffect(DiamondHandsDecorator); // Usually adds armor/magnet

      const stats = BuffManager.getDecoratedStats();
      expect(stats.getDamage()).toBeGreaterThan(10);
      expect(stats.getArmor()).toBeGreaterThan(0);

      expect(BuffManager.getActiveEffects()).toHaveLength(2);
    });
  });

  describe('Cleanup Logic', () => {
    it('should keep permanent buffs when clearing temporary ones', () => {
      BuffManager.addEffect(RageModeDecorator);
      BuffManager.addEffect(DiamondHandsDecorator);

      BuffManager.clearTemporary();

      const effects = BuffManager.getActiveEffects();
      expect(effects).toHaveLength(1);
      expect(effects[0]!.isPermanent).toBe(true);
    });
  });
});
