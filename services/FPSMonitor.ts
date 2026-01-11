/**
 * Runtime FPS Monitor
 *
 * Tracks frame rate stability and triggers automatic quality adjustments
 * if performance drops below acceptable thresholds.
 */

import { DeviceBenchmarkService } from './DeviceBenchmarkService';
import { DeviceProfile } from '../types/DeviceProfile';
import { Logger } from './Logger';
import { EventBus } from './EventBus';

// Config
const CONFIG = {
  SAMPLE_SIZE: 60, // Number of frames to average
  CHECK_INTERVAL_MS: 3000, // Check performance every 3 seconds
  DOWNGRADE_THRESHOLD_FPS: 45, // Downgrade if FPS < 45 (for 60fps target)
  CRITICAL_THRESHOLD_FPS: 25, // Immediate downgrade if FPS < 25
  STABILITY_REQUIRED_MS: 30000, // Time required before considering upgrade (optional)
};

class FPSMonitorClass {
  private frames: number[] = [];
  private lastTime = 0;
  private lastCheckTime = 0;
  private isMonitoring = false;
  private profiles = [
    DeviceProfile.LOW,
    DeviceProfile.MEDIUM,
    DeviceProfile.HIGH,
    DeviceProfile.ULTRA,
  ];

  constructor() {
    // FIXED: Listen to gameReset to clear state between games
    EventBus.on('gameReset', () => this.reset());
  }

  /**
   * Reset state for new game session
   */
  public reset(): void {
    this.frames = [];
    this.lastTime = 0;
    this.lastCheckTime = 0;
    // Note: Don't stop monitoring, just clear accumulated data
    Logger.debug('[FPSMonitor] State reset for new game');
  }

  /**
   * Start monitoring frame loop
   */
  public start() {
    this.isMonitoring = true;
    this.frames = [];
    this.lastTime = performance.now();
    this.lastCheckTime = performance.now();
    Logger.info('[FPSMonitor] Started');
  }

  /**
   * Stop monitoring
   */
  public stop() {
    this.isMonitoring = false;
  }

  /**
   * Record a frame
   * Call this at the start/end of your game loop
   */
  public tick() {
    if (!this.isMonitoring) return;

    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    // Reject outliers (e.g. tab switching pauses)
    if (dt > 1000) return;

    const fps = 1000 / dt;
    this.frames.push(fps);

    if (this.frames.length > CONFIG.SAMPLE_SIZE) {
      this.frames.shift();
    }

    // Periodic check
    if (now - this.lastCheckTime > CONFIG.CHECK_INTERVAL_MS) {
      this.checkPerformance();
      this.lastCheckTime = now;
    }
  }

  /**
   * Analyze performance and adjust profile if needed
   */
  private checkPerformance() {
    if (this.frames.length < CONFIG.SAMPLE_SIZE / 2) return;

    const sum = this.frames.reduce((a, b) => a + b, 0);
    const avgFps = sum / this.frames.length;

    // Get current config to see target
    const currentConfig = DeviceBenchmarkService.getPerformanceConfig();
    const targetFps = currentConfig.targetFPS;

    // Thresholds
    // If target is 30, allow down to 24. If 60, allow down to 45.
    const downgradeThreshold = targetFps === 60 ? CONFIG.DOWNGRADE_THRESHOLD_FPS : 24;

    if (avgFps < downgradeThreshold) {
      Logger.warn(
        `[FPSMonitor] Low FPS detected: ${avgFps.toFixed(1)} (Target: ${targetFps})`
      );
      this.attemptDowngrade(currentConfig.profile);
    }
  }

  private attemptDowngrade(currentProfile: DeviceProfile) {
    const currentIndex = this.profiles.indexOf(currentProfile);

    // If we can go lower
    if (currentIndex > 0) {
      const nextProfile = this.profiles[currentIndex - 1];
      if (nextProfile) {
        Logger.info(
          `[FPSMonitor] Downgrading profile: ${currentProfile} -> ${nextProfile}`
        );
        // Update config
        DeviceBenchmarkService.setManualProfile(nextProfile);
      }

      // Clear frames to give system time to stabilize
      this.frames = [];
    } else {
      // Already at LOW
      Logger.warn('[FPSMonitor] Already at lowest profile, cannot downgrade further.');
    }
  }
}

export const FPSMonitor = new FPSMonitorClass();
