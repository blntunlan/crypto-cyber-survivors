import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DeviceBenchmarkService } from '../../services/system/DeviceBenchmarkService';
import { BenchmarkStatus, DeviceProfile } from '../../types/DeviceProfile';

describe('DeviceBenchmarkService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    DeviceBenchmarkService.resetStateForTesting();

    // Mock canvas
    const mockCtx = {
      shadowBlur: 0,
      shadowColor: '',
      fillStyle: '',
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      clearRect: vi.fn(),
    };

    vi.stubGlobal('document', {
      ...global.document,
      createElement: vi.fn(tag => {
        if (tag === 'canvas') {
          return {
            getContext: vi.fn(() => mockCtx),
            width: 0,
            height: 0,
          };
        }
        return {};
      }),
    });

    // Mock performance.now()
    let time = 1000;
    vi.stubGlobal('performance', {
      now: vi.fn(() => {
        time += 10; // Increment by 10ms each call
        return time;
      }),
    });

    // Mock navigator
    vi.stubGlobal('navigator', {
      hardwareConcurrency: 8,
      deviceMemory: 16,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('Cache Management', () => {
    it('should return cached result if it exists and is valid', async () => {
      const mockResult = {
        gpuScore: 500,
        cpuScore: 500,
        combinedScore: 500,
        profile: DeviceProfile.HIGH,
        timestamp: Date.now(),
        version: '1.0.0',
      };

      localStorage.setItem('ccs_benchmark_result', JSON.stringify(mockResult));

      const result = await DeviceBenchmarkService.runBenchmark();
      expect(result.profile).toBe(DeviceProfile.HIGH);
      expect(DeviceBenchmarkService.getState().status).toBe(BenchmarkStatus.CACHED);
    });

    it('should invalidate expired cache', async () => {
      const expiredResult = {
        gpuScore: 500,
        cpuScore: 500,
        combinedScore: 500,
        profile: DeviceProfile.HIGH,
        timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8 days ago
        version: '1.0.0',
      };
      localStorage.setItem('ccs_benchmark_result', JSON.stringify(expiredResult));

      const promise = DeviceBenchmarkService.runBenchmark();
      await vi.runAllTimersAsync();

      await promise;
      expect(DeviceBenchmarkService.getState().status).toBe(BenchmarkStatus.COMPLETED);
    });
  });

  describe('Benchmark Execution', () => {
    it('should run benchmarks and determine profile', async () => {
      const promise = DeviceBenchmarkService.runBenchmark(true);

      await vi.runAllTimersAsync();

      const result = await promise;
      expect(result.gpuScore).toBeGreaterThan(0);
      expect(result.cpuScore).toBeGreaterThan(0);
      expect(Object.values(DeviceProfile)).toContain(result.profile);
      expect(DeviceBenchmarkService.getState().status).toBe(BenchmarkStatus.COMPLETED);
    });

    it('should notify listeners during progress', async () => {
      const listener = vi.fn();
      DeviceBenchmarkService.subscribe(listener);

      const promise = DeviceBenchmarkService.runBenchmark(true);

      await vi.runAllTimersAsync();
      await promise;

      expect(listener).toHaveBeenCalled();
      expect(listener).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: BenchmarkStatus.COMPLETED,
          progress: 100,
        })
      );
    });
  });

  describe('Manual Overrides', () => {
    it('should respect manual profile setting', () => {
      DeviceBenchmarkService.setManualProfile(DeviceProfile.LOW);
      expect(
        DeviceBenchmarkService.getPerformanceConfig().particleMultiplier
      ).toBeDefined();
      expect(localStorage.getItem('ccs_manual_perf_profile')).toBe(DeviceProfile.LOW);
    });

    it('should clear manual override on resetToAuto', async () => {
      DeviceBenchmarkService.setManualProfile(DeviceProfile.LOW);
      DeviceBenchmarkService.resetToAuto();

      expect(localStorage.getItem('ccs_manual_perf_profile')).toBeNull();
    });
  });

  describe('Fallback', () => {
    it('should return MEDIUM profile as fallback on error', async () => {
      // Mock error in execution
      vi.spyOn(DeviceBenchmarkService as any, 'executeBenchmark').mockRejectedValue(
        new Error('Test error')
      );

      const result = await DeviceBenchmarkService.runBenchmark(true);
      expect(result.profile).toBe(DeviceProfile.MEDIUM);
      expect(DeviceBenchmarkService.getState().status).toBe(BenchmarkStatus.ERROR);
    });
  });
});
