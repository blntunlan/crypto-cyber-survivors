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
  private lastFpsEmitTime = 0;
  private isMonitoring = false;
  private smoothedFps = 0; // Jitter filter (EMA)
  private profiles = [
    DeviceProfile.LOW,
    DeviceProfile.MEDIUM,
    DeviceProfile.HIGH,
    DeviceProfile.ULTRA,
  ];

  // Performance Timings (circular buffers to avoid .shift() O(n))
  private updateDurations: Float64Array = new Float64Array(CONFIG.SAMPLE_SIZE);
  private renderDurations: Float64Array = new Float64Array(CONFIG.SAMPLE_SIZE);
  private physicsDurations: Float64Array = new Float64Array(CONFIG.SAMPLE_SIZE);
  private updateIdx = 0;
  private renderIdx = 0;
  private physicsIdx = 0;
  private updateCount = 0;
  private renderCount = 0;
  private physicsCount = 0;

  constructor() {
    // FIXED: Listen to gameReset to clear state between games
    EventBus.on('gameReset', () => this.reset());
  }

  /**
   * Reset state for new game session
   */
  public reset(): void {
    this.frames = [];
    this.updateDurations.fill(0);
    this.renderDurations.fill(0);
    this.physicsDurations.fill(0);
    this.updateIdx = 0;
    this.renderIdx = 0;
    this.physicsIdx = 0;
    this.updateCount = 0;
    this.renderCount = 0;
    this.physicsCount = 0;
    this.lastTime = 0;
    this.lastCheckTime = 0;
    this.smoothedFps = 0;
    Logger.debug('[FPSMonitor] State reset for new game');
  }

  /**
   * Start monitoring frame loop
   */
  public start() {
    this.isMonitoring = true;
    this.frames = [];
    this.updateDurations.fill(0);
    this.renderDurations.fill(0);
    this.physicsDurations.fill(0);
    this.updateIdx = 0;
    this.renderIdx = 0;
    this.physicsIdx = 0;
    this.updateCount = 0;
    this.renderCount = 0;
    this.physicsCount = 0;
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
    this.updateDurations[this.updateIdx] = duration;
    this.updateIdx = (this.updateIdx + 1) % CONFIG.SAMPLE_SIZE;
    if (this.updateCount < CONFIG.SAMPLE_SIZE) this.updateCount++;
  }

  public recordRender(duration: number) {
    if (!this.isMonitoring) return;
    this.renderDurations[this.renderIdx] = duration;
    this.renderIdx = (this.renderIdx + 1) % CONFIG.SAMPLE_SIZE;
    if (this.renderCount < CONFIG.SAMPLE_SIZE) this.renderCount++;
  }

  public recordPhysics(duration: number) {
    if (!this.isMonitoring) return;
    this.physicsDurations[this.physicsIdx] = duration;
    this.physicsIdx = (this.physicsIdx + 1) % CONFIG.SAMPLE_SIZE;
    if (this.physicsCount < CONFIG.SAMPLE_SIZE) this.physicsCount++;
  }

  private avgTyped(arr: Float64Array, count: number): number {
    if (count === 0) return 0;
    let sum = 0;
    for (let i = 0; i < count; i++) sum += arr[i]!;
    return sum / count;
  }

  private maxTyped(arr: Float64Array, count: number): number {
    if (count === 0) return 0;
    let m = 0;
    for (let i = 0; i < count; i++) if (arr[i]! > m) m = arr[i]!;
    return m;
  }

  public getStats() {
    const avg = (arr: number[]) =>
      arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    return {
      fps: this.smoothedFps || avg(this.frames),
      updateAvg: this.avgTyped(this.updateDurations, this.updateCount),
      updateMax: this.maxTyped(this.updateDurations, this.updateCount),
      renderAvg: this.avgTyped(this.renderDurations, this.renderCount),
      renderMax: this.maxTyped(this.renderDurations, this.renderCount),
      physicsAvg: this.avgTyped(this.physicsDurations, this.physicsCount),
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

    // Emit FPS update for event-driven UI (Throttled to 1s)
    if (now - this.lastFpsEmitTime > 1000) {
      EventBus.emit('fpsUpdated', { avgFps: Math.round(this.smoothedFps) });
      this.lastFpsEmitTime = now;
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
