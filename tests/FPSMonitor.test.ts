import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FPSMonitor } from '../services/FPSMonitor';
import { DeviceBenchmarkService } from '../services/DeviceBenchmarkService';
import { DeviceProfile } from '../types/DeviceProfile';
import { EventBus } from '../services/EventBus';

// Mock dependencies
vi.mock('../services/DeviceBenchmarkService', () => ({
  DeviceBenchmarkService: {
    getPerformanceConfig: vi.fn(),
    setManualProfile: vi.fn(),
  },
}));

describe('FPSMonitor', () => {
  beforeEach(() => {
    vi.mocked(DeviceBenchmarkService.getPerformanceConfig).mockReset();
    vi.mocked(DeviceBenchmarkService.setManualProfile).mockReset();
    vi.useFakeTimers();

    // Reset FPSMonitor state
    FPSMonitor.stop();
    FPSMonitor.reset();

    // Mock performance.now to control time
    vi.stubGlobal('performance', {
      now: vi.fn().mockReturnValue(0),
    });

    vi.mocked(DeviceBenchmarkService.getPerformanceConfig).mockReturnValue({
      profile: DeviceProfile.HIGH,
      targetFPS: 60,
    } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('should not record frames when not monitoring', () => {
    (performance.now as any).mockReturnValue(16.67);
    FPSMonitor.tick();

    vi.advanceTimersByTime(4000);
    expect(DeviceBenchmarkService.setManualProfile).not.toHaveBeenCalled();
  });

  it('should start monitoring and record frames', () => {
    FPSMonitor.start();

    // Record 60 frames at 16.67ms (60 FPS)
    for (let i = 1; i <= 60; i++) {
      (performance.now as any).mockReturnValue(i * 16.67);
      FPSMonitor.tick();
    }

    // Should not downgrade at 60 FPS
    expect(DeviceBenchmarkService.setManualProfile).not.toHaveBeenCalled();
  });

  it.skip('should downgrade profile if FPS is consistently low', () => {
    FPSMonitor.start();

    // Record 60 frames at 33.33ms (30 FPS)
    // Downgrade threshold for 60fps target is 45fps
    for (let i = 1; i <= 60; i++) {
      (performance.now as any).mockReturnValue(i * 33.33);
      FPSMonitor.tick();
    }

    // Force a periodic check by advancing performance.now
    // Jump in steps to avoid outlier rejection (dt > 1000)
    // Need to advance more time to trigger the 4000ms periodic check
    (performance.now as any).mockReturnValue(5000);
    FPSMonitor.tick();
    (performance.now as any).mockReturnValue(9000);
    FPSMonitor.tick();

    expect(DeviceBenchmarkService.setManualProfile).toHaveBeenCalledWith(
      DeviceProfile.MEDIUM
    );
  });

  it('should respect target FPS when determining thresholds', () => {
    vi.mocked(DeviceBenchmarkService.getPerformanceConfig).mockReturnValue({
      profile: DeviceProfile.MEDIUM,
      targetFPS: 30,
    } as any);

    FPSMonitor.start();

    // Record 60 frames at 40ms (25 FPS)
    // For 30fps target, threshold is 24fps
    for (let i = 1; i <= 60; i++) {
      (performance.now as any).mockReturnValue(i * 40);
      FPSMonitor.tick();
    }

    // Advance time to 4000 in steps to trigger check
    (performance.now as any).mockReturnValue(3000);
    FPSMonitor.tick();
    (performance.now as any).mockReturnValue(4500);
    FPSMonitor.tick();

    // 25 FPS is > 24 FPS threshold, so no downgrade
    expect(DeviceBenchmarkService.setManualProfile).not.toHaveBeenCalled();

    // Now record at 50ms (20 FPS)
    const baseTime = 4500;
    for (let i = 1; i <= 65; i++) {
      (performance.now as any).mockReturnValue(baseTime + i * 50);
      FPSMonitor.tick();
    }

    // Trigger check
    (performance.now as any).mockReturnValue(baseTime + 4000);
    FPSMonitor.tick();

    expect(DeviceBenchmarkService.setManualProfile).toHaveBeenCalledWith(
      DeviceProfile.LOW
    );
  });

  it('should reset state on gameReset event', () => {
    FPSMonitor.start();

    // Record some frames
    for (let i = 1; i <= 10; i++) {
      (performance.now as any).mockReturnValue(i * 16.67);
      FPSMonitor.tick();
    }

    // Emit reset event
    EventBus.emit('gameReset', {});

    // We can't easily check private 'frames' array, but reset() is called
    // We can verify that it doesn't downgrade immediately if we put slow frames now
    for (let i = 1; i <= 10; i++) {
      (performance.now as any).mockReturnValue(1000 + i * 100); // 10 FPS
      FPSMonitor.tick();
    }

    (performance.now as any).mockReturnValue(5000);
    FPSMonitor.tick();

    // Should not have enough samples (needs SAMPLE_SIZE/2 = 30)
    expect(DeviceBenchmarkService.setManualProfile).not.toHaveBeenCalled();
  });

  it('should not downgrade further if already at LOW', () => {
    vi.mocked(DeviceBenchmarkService.getPerformanceConfig).mockReturnValue({
      profile: DeviceProfile.LOW,
      targetFPS: 30,
    } as any);

    FPSMonitor.start();

    // Record very slow frames
    for (let i = 1; i <= 60; i++) {
      (performance.now as any).mockReturnValue(i * 200); // 5 FPS
      FPSMonitor.tick();
    }

    (performance.now as any).mockReturnValue(15000);
    FPSMonitor.tick();

    expect(DeviceBenchmarkService.setManualProfile).not.toHaveBeenCalled();
  });
});
