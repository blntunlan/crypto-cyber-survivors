/**
 * Device Benchmark Service
 *
 * Runs GPU and CPU benchmarks to determine device capabilities.
 * Results are cached in localStorage for subsequent visits.
 */

import { Logger } from './Logger';
import {
  DeviceProfile,
  BenchmarkResult,
  BenchmarkStatus,
  BenchmarkState,
  PerformanceConfig,
} from '../types/DeviceProfile';
import {
  BENCHMARK_CONFIG,
  getProfileFromScore,
  calculateCombinedScore,
  getPerformanceConfig,
} from '../config/PerformancePresets';

// =============================================================================
// DEVICE BENCHMARK SERVICE
// =============================================================================

class DeviceBenchmarkServiceClass {
  private state: BenchmarkState = {
    status: BenchmarkStatus.IDLE,
    progress: 0,
    currentTest: '',
    result: null,
    error: null,
  };

  private listeners: Set<(state: BenchmarkState) => void> = new Set();
  private cachedConfig: PerformanceConfig | null = null;

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Get current benchmark state
   */
  getState(): BenchmarkState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: BenchmarkState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Run benchmark or return cached result
   */
  async runBenchmark(forceRun = false): Promise<BenchmarkResult> {
    // Check cache first
    if (!forceRun) {
      const cached = this.loadFromCache();
      if (cached) {
        this.state.result = cached;
        this.state.status = BenchmarkStatus.CACHED;
        this.cachedConfig = getPerformanceConfig(cached.profile);
        this.notifyListeners();
        Logger.info('[Benchmark] Using cached result', { profile: cached.profile });
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
      this.cachedConfig = getPerformanceConfig(result.profile);
      this.saveToCache(result);
      this.notifyListeners();
      Logger.info('[Benchmark] Completed', {
        profile: result.profile,
        gpuScore: result.gpuScore,
        cpuScore: result.cpuScore,
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.state.status = BenchmarkStatus.ERROR;
      this.state.error = message;
      this.notifyListeners();
      Logger.error('[Benchmark] Failed', error);

      // Return fallback MEDIUM profile on error
      return this.getFallbackResult();
    }
  }

  /**
   * Get current performance config (after benchmark)
   */
  getPerformanceConfig(): PerformanceConfig {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }
    // Default to MEDIUM if benchmark hasn't run
    return getPerformanceConfig(DeviceProfile.MEDIUM);
  }

  /**
   * Force a specific profile (for settings override)
   */
  setManualProfile(profile: DeviceProfile): void {
    this.cachedConfig = getPerformanceConfig(profile);
    Logger.info('[Benchmark] Manual profile set', { profile });
    this.notifyListeners();
  }

  /**
   * Reset to automatic profile (from benchmark result)
   */
  resetToAuto(): void {
    if (this.state.result) {
      this.cachedConfig = getPerformanceConfig(this.state.result.profile);
      Logger.info('[Benchmark] Reset to auto profile', { profile: this.state.result.profile });
      this.notifyListeners();
    }
  }

  /**
   * Clear cached benchmark result
   */
  clearCache(): void {
    try {
      localStorage.removeItem(BENCHMARK_CONFIG.CACHE_KEY);
      this.state.result = null;
      this.state.status = BenchmarkStatus.IDLE;
      this.cachedConfig = null;
      this.notifyListeners();
      Logger.info('[Benchmark] Cache cleared');
    } catch {
      // localStorage might not be available
    }
  }

  // ===========================================================================
  // BENCHMARK EXECUTION
  // ===========================================================================

  private async executeBenchmark(): Promise<BenchmarkResult> {
    // Device info
    this.updateProgress(5, 'Detecting device info...');
    const deviceMemory = this.getDeviceMemory();
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const gpuRenderer = this.getGPURenderer();

    // GPU Test
    this.updateProgress(20, 'Running GPU benchmark...');
    const gpuScore = await this.runGPUBenchmark();

    // CPU Test
    this.updateProgress(60, 'Running CPU benchmark...');
    const cpuScore = await this.runCPUBenchmark();

    // Calculate profile
    this.updateProgress(90, 'Calculating profile...');
    const combinedScore = calculateCombinedScore(gpuScore, cpuScore);
    const profile = getProfileFromScore(combinedScore);

    const result: BenchmarkResult = {
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

    return result;
  }

  /**
   * GPU Benchmark: Canvas rendering with shadows
   */
  private async runGPUBenchmark(): Promise<number> {
    return new Promise(resolve => {
      // Use requestAnimationFrame to avoid blocking
      requestAnimationFrame(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(100); // Fallback score
          return;
        }

        const iterations = BENCHMARK_CONFIG.GPU_TEST_ITERATIONS;
        const start = performance.now();

        for (let i = 0; i < iterations; i++) {
          // Shadow rendering (GPU intensive)
          ctx.shadowBlur = 10;
          ctx.shadowColor = `hsl(${(i * 7) % 360}, 80%, 50%)`;
          ctx.fillStyle = `hsl(${(i * 13) % 360}, 70%, 60%)`;
          ctx.beginPath();
          ctx.arc(100, 100, 30 + (i % 20), 0, Math.PI * 2);
          ctx.fill();

          // Clear for next iteration
          if (i % 50 === 0) {
            ctx.clearRect(0, 0, 200, 200);
          }
        }

        const elapsed = performance.now() - start;
        // Score: iterations per millisecond * 100
        const score = Math.round((iterations / elapsed) * 100);
        resolve(Math.min(1000, score)); // Cap at 1000
      });
    });
  }

  /**
   * CPU Benchmark: Math-heavy operations
   */
  private async runCPUBenchmark(): Promise<number> {
    return new Promise(resolve => {
      // Use setTimeout to avoid blocking
      setTimeout(() => {
        const iterations = BENCHMARK_CONFIG.CPU_TEST_ITERATIONS;
        const start = performance.now();

        let sum = 0;
        for (let i = 0; i < iterations; i++) {
          // Heavy math operations
          sum += Math.sin(i) * Math.cos(i);
          sum += Math.sqrt(Math.abs(sum));
          sum = sum % 1000000; // Prevent overflow
        }

        const elapsed = performance.now() - start;
        // Score: iterations per millisecond
        const score = Math.round(iterations / elapsed);
        resolve(Math.min(1000, score)); // Cap at 1000
      }, 0);
    });
  }

  // ===========================================================================
  // DEVICE INFO
  // ===========================================================================

  private getDeviceMemory(): number | null {
    // @ts-expect-error - deviceMemory is not in all browsers
    return navigator.deviceMemory ?? null;
  }

  private getGPURenderer(): string | null {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return null;

      const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
      if (!debugInfo) return null;

      return (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    } catch {
      return null;
    }
  }

  // ===========================================================================
  // CACHE MANAGEMENT
  // ===========================================================================

  private loadFromCache(): BenchmarkResult | null {
    try {
      const cached = localStorage.getItem(BENCHMARK_CONFIG.CACHE_KEY);
      if (!cached) return null;

      const result: BenchmarkResult = JSON.parse(cached);

      // Check version
      if (result.version !== BENCHMARK_CONFIG.VERSION) {
        Logger.info('[Benchmark] Cache invalidated: version mismatch');
        return null;
      }

      // Check expiry
      const age = Date.now() - result.timestamp;
      if (age > BENCHMARK_CONFIG.CACHE_DURATION_MS) {
        Logger.info('[Benchmark] Cache invalidated: expired');
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
      // localStorage might be full or unavailable
    }
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

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
      gpuScore: 300,
      cpuScore: 300,
      combinedScore: 300,
      profile: DeviceProfile.MEDIUM,
      deviceMemory: null,
      hardwareConcurrency: navigator.hardwareConcurrency || 4,
      gpuRenderer: null,
      timestamp: Date.now(),
      version: BENCHMARK_CONFIG.VERSION,
    };
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const DeviceBenchmarkService = new DeviceBenchmarkServiceClass();
