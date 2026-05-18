import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PerformanceTracker } from '../../../services/analytics/PerformanceTracker';
import { RuntimeDiagnosticsService } from '../../../services/system/RuntimeDiagnosticsService';

describe('PerformanceTracker', () => {
  let tracker: PerformanceTracker;

  beforeEach(() => {
    vi.clearAllMocks();
    PerformanceTracker.resetForTesting();
    RuntimeDiagnosticsService.stop();
    RuntimeDiagnosticsService.reset();
    tracker = PerformanceTracker.getInstance();
    vi.useFakeTimers();

    // Mock performance.now
    let time = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => time);
    (performance as any).advance = (ms: number) => {
      time += ms;
    };
  });

  afterEach(() => {
    tracker.stop();
    RuntimeDiagnosticsService.stop();
    RuntimeDiagnosticsService.reset();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should be singleton', () => {
      const tracker2 = PerformanceTracker.getInstance();
      expect(tracker).toBe(tracker2);
    });

    it('should start inactive', () => {
      expect(tracker.isRunning()).toBe(false);
    });

    it('should return default stats when not started', () => {
      const stats = tracker.getStats();
      expect(stats.avgFps).toBe(60);
      expect(stats.sampleCount).toBe(0);
    });
  });

  describe('Start/Stop', () => {
    it('should activate on start()', () => {
      tracker.start();
      expect(tracker.isRunning()).toBe(true);
    });

    it('should deactivate on stop()', () => {
      tracker.start();
      tracker.stop();
      expect(tracker.isRunning()).toBe(false);
    });

    it('should be safe to call start() multiple times', () => {
      tracker.start();
      tracker.start();
      expect(tracker.isRunning()).toBe(true);
    });

    it('should be safe to call stop() multiple times', () => {
      tracker.start();
      tracker.stop();
      tracker.stop();
      expect(tracker.isRunning()).toBe(false);
    });
  });

  describe('Frame Tracking', () => {
    it('should provide stats after sampling', () => {
      tracker.start();
      const loop = (tracker as any).loop;

      // Frame 1: 16ms
      (performance as any).advance(16.67);
      loop();

      // Advance 1 second to trigger sample
      (performance as any).advance(1000);
      loop();

      const stats = tracker.getStats();
      expect(stats.avgFps).toBeGreaterThan(0);
      expect(stats.sampleCount).toBe(1);
    });

    it('should track frame count', () => {
      tracker.start();
      const loop = (tracker as any).loop;

      for (let i = 0; i < 10; i++) {
        (performance as any).advance(16.67);
        loop();
      }

      expect(tracker.getFrameCount()).toBeGreaterThanOrEqual(10);
    });

    it('should update current FPS', () => {
      tracker.start();
      const loop = (tracker as any).loop;

      // 16.67ms frame = 60 FPS
      (performance as any).advance(16.67);
      loop();

      expect(tracker.getCurrentFps()).toBe(60);
    });

    it('should calculate 1% low correctly', () => {
      tracker.start();
      const loop = (tracker as any).loop;

      // Simulate steady 60fps (16.67ms)
      for (let i = 0; i < 50; i++) {
        (performance as any).advance(16.67);
        loop();
      }

      // Simulate one big lag spike (100ms = 10fps)
      (performance as any).advance(100);
      loop();

      const low = tracker.getOnePercentLow();
      // 1% of 51 frames is 0.51 -> index 0.
      // sortedTimes[0] is 100ms.
      expect(low).toBeLessThanOrEqual(20); // Should be low due to the 100ms spike
    });
  });

  describe('Snapshot', () => {
    it('should return complete snapshot', () => {
      tracker.start();
      const loop = (tracker as any).loop;

      (performance as any).advance(16.67);
      loop();
      (performance as any).advance(1000);
      loop();

      const snapshot = tracker.getSnapshot();

      expect(snapshot.timestamp).toBeDefined();
      expect(snapshot.currentFps).toBeGreaterThan(0);
      expect(snapshot.avgFps).toBeGreaterThan(0);
      expect(snapshot.frameCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Elapsed Time', () => {
    it('should track elapsed time when active', () => {
      tracker.start();
      const loop = (tracker as any).loop;

      (performance as any).advance(500);
      loop();

      expect(tracker.getElapsedTime()).toBe(500);
    });

    it('should return 0 when not active', () => {
      expect(tracker.getElapsedTime()).toBe(0);
    });
  });

  describe('Circular Buffer Behavior', () => {
    it('should limit frame times to buffer size', () => {
      tracker.start();
      const loop = (tracker as any).loop;

      // Add more than buffer size (1000) frames
      for (let i = 0; i < 1500; i++) {
        (performance as any).advance(16.67);
        loop();
      }

      // Internal buffer should be capped
      const frameTimes = (tracker as any).frameTimes;
      expect(frameTimes.size()).toBeLessThanOrEqual(1000);
    });

    it('should limit FPS history to buffer size', () => {
      tracker.start();
      const loop = (tracker as any).loop;

      // Trigger more samples than history size (300)
      for (let i = 0; i < 400; i++) {
        (performance as any).advance(16.67);
        loop();
        (performance as any).advance(1000); // Trigger sample
        loop();
      }

      const fpsHistory = (tracker as any).fpsHistory;
      expect(fpsHistory.size()).toBeLessThanOrEqual(300);
    });
  });

  describe('Edge Cases', () => {
    it('should handle 1% low with no frames', () => {
      expect(tracker.getOnePercentLow()).toBe(60);
    });

    it('should return default FPS for getCurrentFps before any frames', () => {
      tracker.start();
      // No frames yet, should return initial value
      expect(tracker.getCurrentFps()).toBe(60);
    });
  });

  describe('Reset for Testing', () => {
    it('should allow fresh instance after reset', () => {
      tracker.start();
      const loop = (tracker as any).loop;
      (performance as any).advance(16.67);
      loop();

      PerformanceTracker.resetForTesting();
      const newTracker = PerformanceTracker.getInstance();

      expect(newTracker.getFrameCount()).toBe(0);
      expect(newTracker.isRunning()).toBe(false);
    });
  });
});
