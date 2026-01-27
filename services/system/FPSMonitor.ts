/**
 * Runtime FPS Monitor
 *
 * Tracks frame rate stability and triggers automatic quality adjustments
 * if performance drops below acceptable thresholds.
 */

import { DeviceBenchmarkService } from './DeviceBenchmarkService';
import { DeviceProfile } from '../../types/DeviceProfile';
import { Logger } from './Logger';
import { EventBus } from '../core/EventBus';

// Config
const CONFIG = {
  SAMPLE_SIZE: 60, // Number of frames to average
  CHECK_INTERVAL_MS: 3000, // Check performance every 3 seconds
  DOWNGRADE_THRESHOLD_FPS: 45, // Downgrade if FPS < 45 (for 60fps target)
  CRITICAL_THRESHOLD_FPS: 25, // Immediate downgrade if FPS < 25
  STABILITY_REQUIRED_MS: 30000, // Time required before considering upgrade (optional)
};

class FPSMonitorClass {
  // Config
  private frames: number[] = [];
  private lastTime = 0;
  private lastCheckTime = 0;
  private isMonitoring = false;
  private smoothedFps = 0; // Jitter filter (EMA)
  private profiles = [
    DeviceProfile.LOW,
    DeviceProfile.MEDIUM,
    DeviceProfile.HIGH,
    DeviceProfile.ULTRA,
  ];

  // Performance Timings
  private updateDurations: number[] = [];
  private renderDurations: number[] = [];
  private physicsDurations: number[] = [];

  constructor() {
    // FIXED: Listen to gameReset to clear state between games
    EventBus.on('gameReset', () => this.reset());
  }

  /**
   * Reset state for new game session
   */
  public reset(): void {
    this.frames = [];
    this.updateDurations = [];
    this.renderDurations = [];
    this.physicsDurations = [];
    this.lastTime = 0;
    this.lastCheckTime = 0;
    this.smoothedFps = 0;
    // Note: Don't stop monitoring, just clear accumulated data
    Logger.debug('[FPSMonitor] State reset for new game');
  }

  /**
   * Start monitoring frame loop
   */
  public start() {
    this.isMonitoring = true;
    this.frames = [];
    this.updateDurations = [];
    this.renderDurations = [];
    this.physicsDurations = [];
    this.lastTime = performance.now();
    this.lastCheckTime = performance.now();
    this.smoothedFps = 0;
    Logger.info('[FPSMonitor] Started');
  }

  /**
   * Stop monitoring
   */
  public stop() {
    this.isMonitoring = false;
  }

  public recordUpdate(duration: number) {
    if (!this.isMonitoring) return;
    this.updateDurations.push(duration);
    if (this.updateDurations.length > CONFIG.SAMPLE_SIZE) this.updateDurations.shift();
  }

  public recordRender(duration: number) {
    if (!this.isMonitoring) return;
    this.renderDurations.push(duration);
    if (this.renderDurations.length > CONFIG.SAMPLE_SIZE) this.renderDurations.shift();
  }

  public recordPhysics(duration: number) {
    if (!this.isMonitoring) return;
    this.physicsDurations.push(duration);
    if (this.physicsDurations.length > CONFIG.SAMPLE_SIZE) {
      this.physicsDurations.shift();
    }
  }

  public getStats() {
    const avg = (arr: number[]) =>
      arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const max = (arr: number[]) => (arr.length ? Math.max(...arr) : 0);

    return {
      fps: this.smoothedFps || avg(this.frames),
      updateAvg: avg(this.updateDurations),
      updateMax: max(this.updateDurations),
      renderAvg: avg(this.renderDurations),
      renderMax: max(this.renderDurations),
      physicsAvg: avg(this.physicsDurations),
      activeEnemies: this.activeEnemies,
      activeBullets: this.activeBullets,
      activeParticles: this.activeParticles,
    };
  }

  // Debug Counts
  private activeEnemies = 0;
  private activeBullets = 0;
  private activeParticles = 0;

  public updateInternalCounts(enemies: number, bullets: number, particles: number) {
    this.activeEnemies = enemies;
    this.activeBullets = bullets;
    this.activeParticles = particles;
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

    // Reject outliers (e.g. tab switching pauses, OS hiccups)
    // 250ms is more sensitive than 1000ms but still ignores meaningful pauses
    if (dt > 250) return;

    const currentFps = 1000 / dt;

    // Apply Exponential Moving Average (EMA) as Jitter Filter
    // Alpha 0.1 means 10% new value + 90% old value
    // This provides a smooth trend and ignores micro-stutters
    if (this.smoothedFps === 0) {
      this.smoothedFps = currentFps;
    } else {
      const alpha = 0.1;
      this.smoothedFps = this.smoothedFps * (1 - alpha) + currentFps * alpha;
    }

    this.frames.push(currentFps);

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

    const avgFps = this.smoothedFps;

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
