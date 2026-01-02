import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TimeService } from '../services/TimeService';

describe('TimeService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TimeService.reset();
    TimeService.setTimeScale(1.0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('should start with zero game time and paused state', () => {
      expect(TimeService.getGameTime()).toBe(0);
      expect(TimeService.isClockPaused()).toBe(true);
    });

    it('should start with default time scale of 1.0', () => {
      expect(TimeService.getTimeScale()).toBe(1.0);
    });
  });

  describe('Pause/Resume', () => {
    it('should not advance time while paused', () => {
      TimeService.update(100);
      TimeService.update(200);
      expect(TimeService.getGameTime()).toBe(0);
    });

    it('should pause and stop time advancement', () => {
      TimeService.start();
      TimeService.update(0);
      TimeService.update(100);

      TimeService.pause();
      const timeAfterPause = TimeService.getGameTime();

      TimeService.update(200);
      TimeService.update(300);

      expect(TimeService.getGameTime()).toBe(timeAfterPause);
    });

    it('should resume time advancement after start', () => {
      TimeService.start();
      TimeService.update(0);
      TimeService.update(50); // 50ms pass
      TimeService.pause();

      const timeBeforeResume = TimeService.getGameTime();

      TimeService.start();
      TimeService.update(100); // Reset lastRealTime
      TimeService.update(150); // 50ms more

      expect(TimeService.getGameTime()).toBeGreaterThan(timeBeforeResume);
    });
  });

  describe('Reset', () => {
    it('should reset all state', () => {
      TimeService.start();
      TimeService.update(0);
      TimeService.update(100);
      TimeService.setTimeScale(2.0);

      TimeService.reset();

      expect(TimeService.getGameTime()).toBe(0);
      expect(TimeService.isClockPaused()).toBe(true);
      expect(TimeService.getDeltaTime()).toBe(0);
      expect(TimeService.getTimeScale()).toBe(1.0);
    });
  });

  describe('Delta Time', () => {
    it('should return delta time correctly', () => {
      TimeService.start();
      TimeService.update(0);
      const delta = TimeService.update(50);

      expect(TimeService.getDeltaTime()).toBe(delta);
    });

    it('should cap delta time to prevent huge jumps', () => {
      TimeService.start();
      TimeService.update(0);

      // Simulate 200ms gap (like tab return)
      const delta = TimeService.update(200);

      // Should be capped to maxDeltaTime (default 50)
      expect(delta).toBeLessThanOrEqual(50);
    });

    it('should apply time scale to delta', () => {
      TimeService.start();
      TimeService.update(100);
      TimeService.setTimeScale(2.0);

      const delta = TimeService.update(110); // 10ms real time

      expect(delta).toBe(20); // 10 * 2.0
    });
  });

  describe('Time Scale', () => {
    it('should allow setting time scale', () => {
      TimeService.setTimeScale(2.0);
      expect(TimeService.getTimeScale()).toBe(2.0);

      TimeService.setTimeScale(0.5);
      expect(TimeService.getTimeScale()).toBe(0.5);
    });

    it('should clamp time scale to minimum', () => {
      TimeService.setTimeScale(0.01);
      expect(TimeService.getTimeScale()).toBe(0.1);
    });

    it('should clamp time scale to maximum', () => {
      TimeService.setTimeScale(10);
      expect(TimeService.getTimeScale()).toBe(3.0);
    });

    it('should ignore NaN time scale', () => {
      TimeService.setTimeScale(2.0);
      TimeService.setTimeScale(NaN);
      expect(TimeService.getTimeScale()).toBe(2.0);
    });

    it('should ignore Infinity time scale', () => {
      TimeService.setTimeScale(2.0);
      TimeService.setTimeScale(Infinity);
      expect(TimeService.getTimeScale()).toBe(2.0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle NaN currentTime', () => {
      TimeService.start();
      TimeService.update(0);

      const delta = TimeService.update(NaN);

      expect(delta).toBe(0);
    });

    it('should handle negative currentTime', () => {
      TimeService.start();
      TimeService.update(0);

      const delta = TimeService.update(-100);

      expect(delta).toBe(0);
    });

    it('should handle backward time jump', () => {
      TimeService.start();
      TimeService.update(100);

      // Time goes backward (system clock change)
      const delta = TimeService.update(50);

      expect(delta).toBe(0);
    });
  });

  describe('FPS', () => {
    it('should return 0 FPS when no valid delta', () => {
      expect(TimeService.getFPS()).toBe(0);
    });

    it('should calculate FPS from delta', () => {
      TimeService.start();
      TimeService.update(100);
      TimeService.update(116.67); // ~60 FPS (16.67ms)

      const fps = TimeService.getFPS();
      expect(fps).toBeGreaterThan(50);
      expect(fps).toBeLessThan(70);
    });
  });

  describe('Formatted Time', () => {
    it('should format zero time', () => {
      expect(TimeService.getFormattedTime()).toBe('00:00');
    });

    it('should format seconds', () => {
      TimeService.start();
      TimeService.update(0);
      TimeService.update(30000); // 30 seconds (capped to 50ms * iterations)

      // Need to accumulate time properly
      TimeService.reset();
      TimeService.start();

      // Simulate 65 seconds
      for (let i = 0; i < 65; i++) {
        TimeService.update(i * 1000);
      }

      const formatted = TimeService.getFormattedTime();
      expect(formatted).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  describe('Stats', () => {
    it('should return complete stats object', () => {
      TimeService.start();
      TimeService.update(0);
      TimeService.update(16.67);

      const stats = TimeService.getStats();

      expect(stats).toHaveProperty('gameTimeMs');
      expect(stats).toHaveProperty('gameTimeSeconds');
      expect(stats).toHaveProperty('deltaTime');
      expect(stats).toHaveProperty('timeScale');
      expect(stats).toHaveProperty('isPaused');
      expect(stats).toHaveProperty('currentFps');
    });
  });

  describe('Max Delta Time', () => {
    it('should allow configuring max delta time', () => {
      TimeService.setMaxDeltaTime(100);
      expect(TimeService.getMaxDeltaTime()).toBe(100);
    });

    it('should clamp max delta to valid range', () => {
      // Zero is invalid, should not change
      const before = TimeService.getMaxDeltaTime();
      TimeService.setMaxDeltaTime(0);
      expect(TimeService.getMaxDeltaTime()).toBe(before);

      // 2000 should be capped to 1000
      TimeService.setMaxDeltaTime(2000);
      expect(TimeService.getMaxDeltaTime()).toBe(1000);
    });

    it('should use configured max delta time', () => {
      TimeService.setMaxDeltaTime(100);
      TimeService.start();
      TimeService.update(0);

      const delta = TimeService.update(500);

      expect(delta).toBeLessThanOrEqual(100);
    });
  });
});
