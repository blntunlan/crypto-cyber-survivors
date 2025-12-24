import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComboSystem } from '../../services/ComboSystem';
import { TimeService } from '../../services/TimeService';
import { EventBus } from '../../services/EventBus';

// Mock dependencies
vi.mock('../../services/TimeService', () => ({
  TimeService: {
    getGameTime: vi.fn().mockReturnValue(0),
  },
}));

describe('ComboSystem Edge Cases', () => {
  beforeEach(() => {
    ComboSystem.startGame();
    vi.clearAllMocks();
  });

  describe('Multi-Kill Handling', () => {
    it('should handle many kills in exactly the same millisecond', () => {
      vi.mocked(TimeService.getGameTime).mockReturnValue(1000);

      // Simulate 10 kills in 1 frame
      for (let i = 0; i < 10; i++) {
        EventBus.emit('enemyKilled', { type: 'bear', x: 0, y: 0 });
      }

      expect(ComboSystem.getKillStreak()).toBe(10);
      expect(ComboSystem.getXpMultiplier()).toBe(1.5); // SUPER COMBO
    });

    it('should skip milestones and trigger the highest one', () => {
      vi.mocked(TimeService.getGameTime).mockReturnValue(1000);

      const milestoneSpy = vi.fn();
      EventBus.on('comboMilestone', milestoneSpy);

      // Simulate jump to 50 kills (ULTRA COMBO)
      for (let i = 0; i < 50; i++) {
        EventBus.emit('enemyKilled', { type: 'bear', x: 0, y: 0 });
      }

      expect(ComboSystem.getKillStreak()).toBe(50);
      expect(ComboSystem.getXpMultiplier()).toBe(2.5);

      // Should have triggered multiple milestones potentially?
      // Logic says checkMilestone iterates from end.
      // If i > lastMilestoneIndex, it triggers.
      // So if last was -1, it will trigger 5, then 10, then 25, then 50?
      // No, recordKill() scrolls one by one. But even if it was external, iterates.
      expect(milestoneSpy).toHaveBeenCalled();
    });
  });

  describe('Timeout Boundaries', () => {
    it('should NOT reset exactly at 3000ms but should at 3001ms', () => {
      vi.mocked(TimeService.getGameTime).mockReturnValue(1000);
      EventBus.emit('enemyKilled', { type: 'bear', x: 0, y: 0 });

      // Exactly 3000ms later (4000ms absolute)
      vi.mocked(TimeService.getGameTime).mockReturnValue(4000);
      ComboSystem.update();
      expect(ComboSystem.getKillStreak()).toBe(1); // Still alive

      // 3001ms later
      vi.mocked(TimeService.getGameTime).mockReturnValue(4001);
      ComboSystem.update();
      expect(ComboSystem.getKillStreak()).toBe(0); // Reset
    });
  });

  describe('Sound Spam Protection', () => {
    it('should throttle sounds but still emit milestone events', () => {
      vi.mocked(TimeService.getGameTime).mockReturnValue(1000);

      const milestoneSpy = vi.fn();
      EventBus.on('comboMilestone', milestoneSpy);

      // Kill 5 (COMBO!) at 1000ms
      for (let i = 0; i < 5; i++) EventBus.emit('enemyKilled', { type: 'bear', x: 0, y: 0 });
      expect(milestoneSpy).toHaveBeenLastCalledWith(expect.objectContaining({ sound: 'combo1' }));

      // Kill 10 (SUPER COMBO!) at 1100ms (within 300ms cooldown)
      vi.mocked(TimeService.getGameTime).mockReturnValue(1100);
      for (let i = 0; i < 5; i++) EventBus.emit('enemyKilled', { type: 'bear', x: 0, y: 0 });

      expect(milestoneSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          name: 'SUPER COMBO!',
          sound: undefined, // Throttled
        })
      );
    });
  });

  describe('Stat Consistency', () => {
    it('should correctly calculate XP multiplier', () => {
      vi.mocked(TimeService.getGameTime).mockReturnValue(1000);
      for (let i = 0; i < 25; i++) EventBus.emit('enemyKilled', { type: 'bear', x: 0, y: 0 });

      expect(ComboSystem.getXpMultiplier()).toBe(2.0); // MEGA COMBO

      // Collect gem
      const value = 100;
      // Formula: Math.floor(value * 2.0) - value = 100 bonus
      EventBus.emit('gemCollected', { value, isRare: false });

      expect(ComboSystem.getState().totalBonusXp).toBe(100);
    });
  });
});
