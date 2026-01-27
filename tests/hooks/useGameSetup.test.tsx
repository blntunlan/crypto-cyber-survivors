import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGameSetup } from '../../hooks/useGameSetup';
import { FPSMonitor } from '../../services/system/FPSMonitor';

// Mock dependencies
vi.mock('../../services/system/FPSMonitor', () => ({
  FPSMonitor: {
    start: vi.fn(),
    stop: vi.fn(),
  },
}));

vi.mock('../../services/system/DeviceBenchmarkService', () => ({
  DeviceBenchmarkService: {
    getPerformanceConfig: vi.fn().mockReturnValue({
      particleMultiplier: 1.0,
      candleCount: 10,
    }),
    subscribe: vi.fn().mockReturnValue(() => {}),
  },
}));

const mockPool = {
  current: {
    preWarm: vi.fn(),
  },
};

const mockState = {
  current: {
    bgCandles: [],
  },
};

describe('useGameSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start FPS monitor and pre-warm pools on mount', () => {
    renderHook(() =>
      useGameSetup({
        pool: mockPool as any,
        state: mockState as any,
        width: 800,
        height: 600,
      })
    );

    expect(FPSMonitor.start).toHaveBeenCalled();
    expect(mockPool.current.preWarm).toHaveBeenCalledWith(
      expect.objectContaining({
        bullets: 80,
        particles: 150,
      })
    );
  });

  it('should generate background candles', () => {
    renderHook(() =>
      useGameSetup({
        pool: mockPool as any,
        state: mockState as any,
        width: 800,
        height: 600,
      })
    );

    expect(mockState.current.bgCandles.length).toBeGreaterThan(0);
  });

  it('should stop FPS monitor on unmount', () => {
    const { unmount } = renderHook(() =>
      useGameSetup({
        pool: mockPool as any,
        state: mockState as any,
        width: 800,
        height: 600,
      })
    );

    unmount();
    expect(FPSMonitor.stop).toHaveBeenCalled();
  });
});
