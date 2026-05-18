/**
 * Device Benchmark Service
 *
 * Runs GPU and CPU benchmarks to determine device capabilities.
 * Results are cached in localStorage for subsequent visits.
 */

import { Logger } from './Logger';
import {
  DeviceProfile,
  type BenchmarkResult,
  BenchmarkStatus,
  type BenchmarkState,
  type PerformanceConfig,
} from '../../types/DeviceProfile';
import {
  BENCHMARK_CONFIG,
  getProfileFromScore,
  calculateCombinedScore,
  getPerformanceConfig,
} from '../../config/PerformancePresets';
import { BENCHMARK } from '../../constants';

const MANUAL_PROFILE_KEY = 'ccs_manual_perf_profile';

/**
 * DeviceBenchmarkServiceClass - Orchestrates hardware performance evaluation
 */
export class DeviceBenchmarkServiceClass {
  private state: BenchmarkState = {
    status: BenchmarkStatus.IDLE,
    progress: 0,
    currentTest: '',
    result: null,
    error: null,
  };

  private listeners: Set<(state: BenchmarkState) => void> = new Set();
  private cachedConfig: PerformanceConfig | null = null;

  // Track if user has manually set a profile (persists in memory)
  private isManualMode: boolean = false;

  constructor() {
    // Try to load from localStorage first
    this.isManualMode = this.loadManualProfile();
  }

  /**
   * Reset state for testing
   */
  public resetStateForTesting(): void {
    this.state = {
      status: BenchmarkStatus.IDLE,
      progress: 0,
      currentTest: '',
      result: null,
      error: null,
    };
    this.listeners.clear();
    this.cachedConfig = null;
    this.isManualMode = this.loadManualProfile();
  }

  /**
   * Internal loader for manually selected profile.
   *
   * @private
   */
  private loadManualProfile(): boolean {
    try {
      const stored = localStorage.getItem(MANUAL_PROFILE_KEY);
      if (stored && Object.values(DeviceProfile).includes(stored as DeviceProfile)) {
        const profile = stored as DeviceProfile;
        this.cachedConfig = getPerformanceConfig(profile);
        this.isManualMode = true;
        Logger.info('[Benchmark] Manual profile loaded from localStorage', { profile });
        return true;
      }
    } catch (err) {
      Logger.error('[Benchmark] Failed to load manual profile', err);
    }
    return false;
  }

  /**
   * Returns true when a manual override is active in memory or persisted storage.
   */
  private hasManualOverride(): boolean {
    if (this.isManualMode) {
      return true;
    }

    return this.loadManualProfile();
  }

  /**
   * Returns current snapshot of the benchmark status.
   */
  public getState(): BenchmarkState {
    return { ...this.state };
  }

  /**
   * Registers a listener for benchmark state transitions.
   *
   * @param listener Callback received when state changes
   * @returns Unsubscribe function
   */
  public subscribe(listener: (state: BenchmarkState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Returns true if user has locked a specific performance profile.
   */
  public isInManualMode(): boolean {
    return this.isManualMode;
  }

  /**
   * Executes the device benchmark suite.
   *
   * @param forceRun If true, ignores cached results and runs full test
   */
  public async runBenchmark(forceRun = false): Promise<BenchmarkResult> {
    // Check cache first (unless forced)
    if (!forceRun) {
      const cached = this.loadFromCache();
      if (cached) {
        this.state.result = cached;
        this.state.status = BenchmarkStatus.CACHED;

        // If NO manual profile exists, use benchmark result for active config
        if (!this.hasManualOverride()) {
          this.cachedConfig = getPerformanceConfig(cached.profile);
          Logger.info('[Benchmark] Using cached benchmark result for config', {
            profile: cached.profile,
          });
        }
        this.notifyListeners();
        return cached;
      }
    }

    // Run benchmark
    this.state.status = BenchmarkStatus.RUNNING;
    this.state.progress = 0;
    this.state.error = null;
    this.notifyListeners();

    try {
      const result = await this.executeBenchmark();
      this.state.result = result;
      this.state.status = BenchmarkStatus.COMPLETED;
      this.state.progress = 100;

      // If NO manual profile exists, use benchmark result for active config
      if (!this.hasManualOverride()) {
        this.cachedConfig = getPerformanceConfig(result.profile);
      }

      this.saveToCache(result);
      this.notifyListeners();
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.state.status = BenchmarkStatus.ERROR;
      this.state.error = message;
      this.notifyListeners();
      Logger.error('[Benchmark] Failed', error);

      return this.getFallbackResult();
    }
  }

  /**
   * Returns the appropriate performance configuration for the current device.
   */
  public getPerformanceConfig(): PerformanceConfig {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }
    if (this.loadManualProfile()) {
      return this.cachedConfig!;
    }

    // Default fallback
    return getPerformanceConfig(DeviceProfile.MEDIUM);
  }

  /**
   * Manually overrides the performance profile.
   *
   * @param profile The target profile (LOW, MEDIUM, HIGH, etc.)
   */
  public setManualProfile(profile: DeviceProfile): void {
    this.cachedConfig = getPerformanceConfig(profile);
    this.isManualMode = true;

    try {
      localStorage.setItem(MANUAL_PROFILE_KEY, profile);
    } catch (err) {
      Logger.warn('[Benchmark] localStorage not available', err);
    }

    this.notifyListeners();
  }

  /**
   * Removes manual override and reverts to benchmark-based profile.
   */
  public resetToAuto(): void {
    this.isManualMode = false;

    try {
      localStorage.removeItem(MANUAL_PROFILE_KEY);
    } catch (err) {
      Logger.warn('[Benchmark] Failed to remove manual profile', err);
    }

    if (this.state.result) {
      this.cachedConfig = getPerformanceConfig(this.state.result.profile);
      this.notifyListeners();
    } else {
      this.cachedConfig = null;
      void this.runBenchmark(false);
    }
  }

  /**
   * Purges all cached performance data.
   */
  public clearCache(): void {
    try {
      localStorage.removeItem(BENCHMARK_CONFIG.CACHE_KEY);
      localStorage.removeItem(MANUAL_PROFILE_KEY);
      this.state.result = null;
      this.state.status = BenchmarkStatus.IDLE;
      this.cachedConfig = null;
      this.isManualMode = false;
      this.notifyListeners();
    } catch {
      // ignore
    }
  }

  /**
   * High-level benchmark orchestrator.
   *
   * @private
   */
  private async executeBenchmark(): Promise<BenchmarkResult> {
    this.updateProgress(BENCHMARK.PROGRESS_INFO, 'Detecting device info...');
    const deviceMemory = this.getDeviceMemory();
    const hardwareConcurrency = navigator.hardwareConcurrency;
    const gpuRenderer = this.getGPURenderer();

    this.updateProgress(BENCHMARK.PROGRESS_GPU, 'Running GPU benchmark...');
    const gpuScore = await this.runGPUBenchmark();

    this.updateProgress(BENCHMARK.PROGRESS_CPU, 'Running CPU benchmark...');
    const cpuScore = await this.runCPUBenchmark();

    this.updateProgress(BENCHMARK.PROGRESS_CALC, 'Calculating profile...');
    const combinedScore = calculateCombinedScore(gpuScore, cpuScore);
    const profile = getProfileFromScore(combinedScore);

    return {
      gpuScore,
      cpuScore,
      combinedScore,
      profile,
      deviceMemory,
      hardwareConcurrency,
      gpuRenderer,
      timestamp: Date.now(),
      version: BENCHMARK_CONFIG.VERSION,
    };
  }

  /**
   * GPU Stress Test using canvas effects.
   *
   * @private
   */
  private async runGPUBenchmark(): Promise<number> {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(BENCHMARK.FALLBACK_SCORE / 3);
          return;
        }

        const iterations = BENCHMARK.GPU_ITERATIONS;
        const start = performance.now();

        for (let i = 0; i < iterations; i++) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = `hsl(${(i * 7) % 360}, 80%, 50%)`;
          ctx.fillStyle = `hsl(${(i * 13) % 360}, 70%, 60%)`;
          ctx.beginPath();
          ctx.arc(100, 100, 30 + (i % 20), 0, Math.PI * 2);
          ctx.fill();

          if (i % 50 === 0) {
            ctx.clearRect(0, 0, 200, 200);
          }
        }

        const elapsed = performance.now() - start;
        const score = Math.round((iterations / elapsed) * 100);
        resolve(Math.min(BENCHMARK.MAX_SCORE, score));
      });
    });
  }

  /**
   * CPU Logic Test using trigonometric iterations.
   *
   * @private
   */
  private async runCPUBenchmark(): Promise<number> {
    return new Promise(resolve => {
      setTimeout(() => {
        const iterations = BENCHMARK.CPU_ITERATIONS;
        const start = performance.now();

        let sum = 0;
        for (let i = 0; i < iterations; i++) {
          sum += Math.sin(i) * Math.cos(i);
          sum += Math.sqrt(Math.abs(sum));
          sum = sum % 1000000;
        }

        const elapsed = performance.now() - start;
        const score = Math.round(iterations / elapsed);
        resolve(Math.min(BENCHMARK.MAX_SCORE, score));
      }, 0);
    });
  }

  private getDeviceMemory(): number | null {
    // @ts-expect-error - deviceMemory is not in all browsers
    return navigator.deviceMemory ?? null;
  }

  private getGPURenderer(): string | null {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl');
      if (!gl) return null;

      const debugInfo = (gl as WebGLRenderingContext).getExtension(
        'WEBGL_debug_renderer_info'
      );
      if (!debugInfo) return null;

      return (gl as WebGLRenderingContext).getParameter(
        debugInfo.UNMASKED_RENDERER_WEBGL
      );
    } catch {
      return null;
    }
  }

  private loadFromCache(): BenchmarkResult | null {
    try {
      const cached = localStorage.getItem(BENCHMARK_CONFIG.CACHE_KEY);
      if (!cached) return null;

      const result: BenchmarkResult = JSON.parse(cached);

      if (result.version !== BENCHMARK_CONFIG.VERSION) {
        return null;
      }

      const age = Date.now() - result.timestamp;
      if (age > BENCHMARK_CONFIG.CACHE_DURATION_MS) {
        return null;
      }

      return result;
    } catch {
      return null;
    }
  }

  private saveToCache(result: BenchmarkResult): void {
    try {
      localStorage.setItem(BENCHMARK_CONFIG.CACHE_KEY, JSON.stringify(result));
    } catch {
      // ignore
    }
  }

  private updateProgress(progress: number, currentTest: string): void {
    this.state.progress = progress;
    this.state.currentTest = currentTest;
    this.notifyListeners();
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }

  private getFallbackResult(): BenchmarkResult {
    return {
      gpuScore: BENCHMARK.FALLBACK_SCORE,
      cpuScore: BENCHMARK.FALLBACK_SCORE,
      combinedScore: BENCHMARK.FALLBACK_SCORE,
      profile: DeviceProfile.MEDIUM,
      deviceMemory: null,
      hardwareConcurrency: navigator.hardwareConcurrency,
      gpuRenderer: null,
      timestamp: Date.now(),
      version: BENCHMARK_CONFIG.VERSION,
    };
  }
}

export const DeviceBenchmarkService = new DeviceBenchmarkServiceClass();
