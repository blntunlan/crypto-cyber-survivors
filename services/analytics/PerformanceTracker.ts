import { Logger } from '../Logger';

export interface PerformanceSnapshot {
  timestamp: number;
  currentFps: number;
  avgFps: number;
  minFps: number;
  maxFps: number;
  frameCount: number;
  memoryUsedMB?: number;
}

export class PerformanceTracker {
  private static instance: PerformanceTracker | undefined = undefined;
  private frameTimes: number[] = [];
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private startTime: number = 0;
  private fpsHistory: number[] = [];
  private samplingInterval: number = 1000; // 1 second
  private lastSampleTime: number = 0;
  private isActive: boolean = false;
  private animationId: number | null = null;

  private constructor() {
    this.lastFrameTime = performance.now();
  }

  static getInstance(): PerformanceTracker {
    PerformanceTracker.instance ??= new PerformanceTracker();
    return PerformanceTracker.instance;
  }

  start(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.startTime = performance.now();
    this.lastSampleTime = this.startTime;
    this.frameCount = 0;
    this.frameTimes = [];
    this.fpsHistory = [];
    this.lastFrameTime = performance.now();

    this.loop();
    Logger.info('[PerformanceTracker] Started');
  }

  stop(): void {
    this.isActive = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    Logger.info('[PerformanceTracker] Stopped');
  }

  private loop = (): void => {
    if (!this.isActive) return;

    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;
    this.frameCount++;

    if (deltaTime > 0) {
      this.frameTimes.push(deltaTime);
    }

    // Keep frameTimes buffer reasonable
    if (this.frameTimes.length > 1000) {
      this.frameTimes.shift();
    }

    // Sampling
    if (now - this.lastSampleTime >= this.samplingInterval) {
      this.sample(now);
      this.lastSampleTime = now;
    }

    this.animationId = requestAnimationFrame(this.loop);
  };

  private sample(_now: number): void {
    const fps = Math.round(
      1000 / (this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length)
    );
    if (!isNaN(fps)) {
      this.fpsHistory.push(fps);
    }

    // Memory usage (Chrome only)
    // @ts-expect-error - Chrome-only memory API
    const memory = performance.memory;
    if (memory) {
      // Logger.debug(`[Performance] FPS: ${fps}, Memory: ${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`);
    }
  }

  getStats() {
    if (this.fpsHistory.length === 0) {
      return {
        avgFps: 60,
        minFps: 60,
        maxFps: 60,
        sampleCount: 0,
      };
    }

    const avgFps = Math.round(this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length);
    const minFps = Math.min(...this.fpsHistory);
    const maxFps = Math.max(...this.fpsHistory);

    return {
      avgFps,
      minFps,
      maxFps,
      sampleCount: this.fpsHistory.length,
    };
  }

  /**
   * Get 1% Low FPS (more representative of stutter than absolute min)
   */
  getOnePercentLow(): number {
    if (this.frameTimes.length === 0) return 60;

    const sortedTimes = [...this.frameTimes].sort((a, b) => b - a);
    const index = Math.max(0, Math.floor(sortedTimes.length * 0.01));
    const onePercentTime = sortedTimes[index] ?? 16.67;

    return Math.round(1000 / onePercentTime);
  }
}
