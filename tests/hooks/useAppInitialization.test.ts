import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAppInitialization } from '../../hooks/useAppInitialization';
import { DeviceBenchmarkService } from '../../services/system/DeviceBenchmarkService';

vi.mock('../../services/system/DeviceBenchmarkService', () => ({
  DeviceBenchmarkService: {
    runBenchmark: vi.fn(),
  },
}));

vi.mock('../../services/analytics/ErrorTracker', () => ({}));
vi.mock('../../services/analytics/PlayerTracker', () => ({}));
vi.mock('../../services/analytics/DeviceProfiler', () => ({
  DeviceProfiler: {
    syncToSupabase: vi.fn(async () => undefined),
  },
}));

describe('useAppInitialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes app', async () => {
    const { result } = renderHook(() => useAppInitialization());

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    expect(DeviceBenchmarkService.runBenchmark).toHaveBeenCalledTimes(1);
  });
});
