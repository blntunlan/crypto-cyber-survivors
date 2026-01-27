/**
 * PerformanceTracker - FPS and Frame Time Monitoring
 *
 * Tracks game performance metrics using a circular buffer for
 * efficient O(1) frame time storage. Provides FPS statistics
 * including average, min, max, and 1% low.
 *
 * Edge Cases Handled:
 * - Empty frame times → returns default 60 FPS
 * - Division by zero → safely handled
 * - Memory limits → circular buffers prevent unbounded growth
 */

import { Logger } from '../system/Logger';

export interface PerformanceSnapshot {
  timestamp: number;
  currentFps: number;
  avgFps: number;
  minFps: number;
  maxFps: number;
  frameCount: number;
  memoryUsedMB?: number;
}

export interface PerformanceStats {
  avgFps: number;
  minFps: number;
  maxFps: number;
  onePercentLow: number;
  avgFrameTime: number;
  maxFrameTime: number;
  sampleCount: number;
}

/**
 * Circular buffer for efficient O(1) push with fixed capacity.
 */
class CircularBuffer<T> {
  private buffer: T[];
  private head: number = 0;
  private length: number = 0;
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  push(value: T): void {
    this.buffer[this.head] = value;
    this.head = (this.head + 1) % this.capacity;
    if (this.length < this.capacity) {
      this.length++;
    }
  }

  getAll(): T[] {
    if (this.length === 0) return [];

    const result: T[] = [];
    const start = this.length < this.capacity ? 0 : this.head;
    for (let i = 0; i < this.length; i++) {
      const index = (start + i) % this.capacity;
      result.push(this.buffer[index]!);
    }
    return result;
  }

  size(): number {
    return this.length;
  }

  clear(): void {
    this.head = 0;
    this.length = 0;
  }

  isEmpty(): boolean {
    return this.length === 0;
  }
}

export class PerformanceTracker {
  private static instance: PerformanceTracker | undefined = undefined;

  // Circular buffer for frame times (stores last 1000 frame deltas)
  private frameTimes: CircularBuffer<number>;

  // Circular buffer for FPS samples (stores last 300 samples = 5 min at 1s interval)
  private fpsHistory: CircularBuffer<number>;

  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private startTime: number = 0;
  private readonly samplingInterval: number = 1000; // 1 second
  private lastSampleTime: number = 0;
  private isActive: boolean = false;
  private animationId: number | null = null;
  private currentFps: number = 60;

  private static readonly FRAME_BUFFER_SIZE = 1000;
  private static readonly FPS_HISTORY_SIZE = 300;

  private constructor() {
    this.frameTimes = new CircularBuffer(PerformanceTracker.FRAME_BUFFER_SIZE);
    this.fpsHistory = new CircularBuffer(PerformanceTracker.FPS_HISTORY_SIZE);
    this.lastFrameTime = performance.now();
  }

  static getInstance(): PerformanceTracker {
    PerformanceTracker.instance ??= new PerformanceTracker();
    return PerformanceTracker.instance;
  }

  /**
   * Start performance tracking loop.
   */
  start(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.startTime = performance.now();
    this.lastSampleTime = this.startTime;
    this.frameCount = 0;
    this.frameTimes.clear();
    this.fpsHistory.clear();
    this.lastFrameTime = performance.now();
    this.currentFps = 60;

    this.loop();
    Logger.info('[PerformanceTracker] Started');
  }

  /**
   * Stop performance tracking.
   */
  stop(): void {
    if (!this.isActive) return;

    this.isActive = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    Logger.info('[PerformanceTracker] Stopped');
  }

  /**
   * Check if tracker is currently active.
   */
  isRunning(): boolean {
    return this.isActive;
  }

  /**
   * Get current instantaneous FPS.
   */
  getCurrentFps(): number {
    return this.currentFps;
  }

  /**
   * Main tracking loop - runs via requestAnimationFrame.
   */
  private loop = (): void => {
    if (!this.isActive) return;

    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;
    this.frameCount++;

    // Only track positive frame times
    if (deltaTime > 0) {
      this.frameTimes.push(deltaTime);
      // Update current FPS (smoothed)
      this.currentFps = Math.round(1000 / deltaTime);
    }

    // Periodic sampling
    if (now - this.lastSampleTime >= this.samplingInterval) {
      this.sample();
      this.lastSampleTime = now;
    }

    this.animationId = requestAnimationFrame(this.loop);
  };

  /**
   * Take a sample of average FPS over the last interval.
   */
  private sample(): void {
    const times = this.frameTimes.getAll();

    if (times.length === 0) {
      return;
    }

    const avgFrameTime = times.reduce((a, b) => a + b, 0) / times.length;

    // Avoid division by zero
    if (avgFrameTime <= 0) {
      return;
    }

    const fps = Math.round(1000 / avgFrameTime);

    // Validate FPS is reasonable (0-240 range)
    if (Number.isFinite(fps) && fps > 0 && fps <= 240) {
      this.fpsHistory.push(fps);
    }
  }

  /**
   * Get aggregate performance statistics.
   */
  getStats(): PerformanceStats {
    const history = this.fpsHistory.getAll();
    const frameTimes = this.frameTimes.getAll();

    if (history.length === 0) {
      return {
        avgFps: 60,
        minFps: 60,
        maxFps: 60,
        onePercentLow: 60,
        avgFrameTime: 16.67,
        maxFrameTime: 16.67,
        sampleCount: 0,
      };
    }

    const sum = history.reduce((a, b) => a + b, 0);
    const avgFps = Math.round(sum / history.length);
    const minFps = Math.min(...history);
    const maxFps = Math.max(...history);

    const avgFrameTime =
      frameTimes.length > 0
        ? frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
        : 16.67;

    const maxFrameTime = frameTimes.length > 0 ? Math.max(...frameTimes) : 16.67;

    return {
      avgFps,
      minFps,
      maxFps,
      onePercentLow: this.getOnePercentLow(),
      avgFrameTime,
      maxFrameTime,
      sampleCount: history.length,
    };
  }

  /**
   * Get 1% Low FPS - more representative of stutter than absolute min.
   * This is the FPS at the 99th percentile of frame times.
   */
  getOnePercentLow(): number {
    const times = this.frameTimes.getAll();

    if (times.length === 0) {
      return 60;
    }

    // Sort descending (longest frames first)
    const sortedTimes = [...times].sort((a, b) => b - a);

    // Get the frame time at 1% index
    const index = Math.max(0, Math.floor(sortedTimes.length * 0.01));
    const onePercentTime = sortedTimes[index];

    if (!onePercentTime || onePercentTime <= 0) {
      return 60;
    }

    return Math.round(1000 / onePercentTime);
  }

  /**
   * Get a full snapshot of current performance state.
   */
  getSnapshot(): PerformanceSnapshot {
    const stats = this.getStats();

    // Memory usage (Chrome only)
    let memoryUsedMB: number | undefined;
    // @ts-expect-error - Chrome-only memory API
    const memory = performance.memory;
    if (memory?.usedJSHeapSize) {
      memoryUsedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
    }

    return {
      timestamp: Date.now(),
      currentFps: this.currentFps,
      avgFps: stats.avgFps,
      minFps: stats.minFps,
      maxFps: stats.maxFps,
      frameCount: this.frameCount,
      memoryUsedMB,
    };
  }

  /**
   * Sync performance metrics to Supabase.
   */
  async syncToSupabase(sessionId?: string): Promise<void> {
    const stats = this.getStats();
    const snapshot = this.getSnapshot();

    const { supabase, isSupabaseConfigured } = await import('../core/Supabase');
    const { UserSessionService } = await import('../auth/UserSessionService');
    const { DeviceProfiler } = await import('./DeviceProfiler');

    if (isSupabaseConfigured() && supabase) {
      const profileId = UserSessionService.getProfileId();
      const device = DeviceProfiler.getProfile();

      try {
        // Define extended navigator for non-standard properties
        interface ExtendedNavigator extends Navigator {
          deviceMemory?: number;
        }
        const extendedNav = navigator as ExtendedNavigator;

        await supabase.from('performance_metrics').insert({
          profile_id: profileId.startsWith('anon-') ? null : profileId,
          session_id: sessionId ?? null,
          device_platform: window.innerWidth < 768 ? 'mobile' : 'desktop',
          // eslint-disable-next-line @typescript-eslint/no-deprecated
          device_model: navigator.platform,
          os_info: navigator.userAgent,
          memory_gb: extendedNav.deviceMemory ?? null,
          cpu_cores: navigator.hardwareConcurrency || null,
          avg_fps: stats.avgFps,
          min_fps: stats.minFps,
          max_fps: stats.maxFps,
          frame_drops:
            stats.sampleCount > 0
              ? Math.floor((60 - stats.avgFps) * stats.sampleCount)
              : 0,
          resolution: `${window.innerWidth}x${window.innerHeight}`,
          gpu_info: device.gpu,
          metadata: {
            memoryUsedMB: snapshot.memoryUsedMB,
            onePercentLow: stats.onePercentLow,
            avgFrameTime: stats.avgFrameTime,
          },
        });
        Logger.info('[PerformanceTracker] Metrics synced to Supabase');
      } catch (error) {
        Logger.warn('[PerformanceTracker] Failed to sync metrics', error);
      }
    }
  }

  /**
   * Get total elapsed time since start (ms).
   */
  getElapsedTime(): number {
    if (!this.isActive) return 0;
    return performance.now() - this.startTime;
  }

  /**
   * Get total frame count since start.
   */
  getFrameCount(): number {
    return this.frameCount;
  }

  /**
   * Reset for testing purposes.
   */
  static resetForTesting(): void {
    if (this.instance) {
      this.instance.stop();
      this.instance = undefined;
    }
  }
}
