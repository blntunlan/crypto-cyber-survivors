import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGameEvents } from '../../hooks/useGameEvents';
import { EventBus } from '../../services/core/EventBus';
import { audio } from '../../services/audio';
import { BuffManager } from '../../services/patterns/decorators/BuffManager';

// Mock dependencies
vi.mock('../../services/core/EventBus', () => ({
  EventBus: {
    subscribe: vi.fn((_event, _callback) => {
      // Simulate immediate callback trigger for threating if needed, but usually we emit event manually.
      // Store callbacks to trigger them manually.
      return vi.fn();
    }),
    on: vi.fn(), // Mock 'on' for TimeService
    emit: vi.fn(),
  },
}));

vi.mock('../../services/audio', () => ({
  audio: {
    playHit: vi.fn(),
  },
}));

vi.mock('../../services/patterns/decorators/BuffManager', () => ({
  BuffManager: {
    reset: vi.fn(),
  },
}));

vi.mock('../../services/spawners/BuffGemSpawner', () => ({
  BuffGemSpawner: {
    reset: vi.fn(),
  },
}));

const mockPool = {
  current: {
    clearAll: vi.fn(),
    activeEnemies: [{ health: 100 }, { health: 50 }],
    getFloatingText: vi.fn(),
  },
};

const mockState = {
  current: {
    bgCandles: [],
    dashTrail: ['trail'],
    shake: 0,
  },
};

const mockSpawnSystem = {
  current: {
    reset: vi.fn(),
  },
};

describe('useGameEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mockPool.current.activeEnemies[0] as any).health = 100;
    (mockPool.current.activeEnemies[1] as any).health = 50;
  });

  it('should subscribe to events on mount', () => {
    renderHook(() =>
      useGameEvents({
        pool: mockPool as any,
        state: mockState as any,
        spawnSystem: mockSpawnSystem as any,
      })
    );

    expect(EventBus.subscribe).toHaveBeenCalledWith('afterReset', expect.any(Function));
    expect(EventBus.subscribe).toHaveBeenCalledWith('killAll', expect.any(Function));
    expect(EventBus.subscribe).toHaveBeenCalledWith(
      'playerHealed',
      expect.any(Function)
    );
    expect(EventBus.subscribe).toHaveBeenCalledWith(
      'volatilityShock',
      expect.any(Function)
    );
  });

  it('should handle afterReset event', () => {
    // Capture the callback
    let resetCallback: (() => void) | undefined;
    (EventBus.subscribe as any).mockImplementation((event: string, cb: () => void) => {
      if (event === 'afterReset') resetCallback = cb;
      return vi.fn();
    });

    renderHook(() =>
      useGameEvents({
        pool: mockPool as any,
        state: mockState as any,
        spawnSystem: mockSpawnSystem as any,
      })
    );

    // Trigger callback
    expect(resetCallback).toBeDefined();
    resetCallback!();

    expect(mockPool.current.clearAll).toHaveBeenCalled();
    expect(mockState.current.dashTrail).toHaveLength(0);
    expect(BuffManager.reset).toHaveBeenCalled();
    expect(mockSpawnSystem.current.reset).toHaveBeenCalled();
  });

  it('should handle killAll cheat', () => {
    let killCallback: (() => void) | undefined;
    (EventBus.subscribe as any).mockImplementation((event: string, cb: () => void) => {
      if (event === 'killAll') killCallback = cb;
      return vi.fn();
    });

    renderHook(() =>
      useGameEvents({
        pool: mockPool as any,
        state: mockState as any,
        spawnSystem: mockSpawnSystem as any,
      })
    );

    killCallback!();

    expect(mockState.current.shake).toBe(20);
    expect(audio.playHit).toHaveBeenCalled();
    expect(mockPool.current.activeEnemies[0]!.health).toBe(0);
  });

  it('should handle playerHealed event', () => {
    let healCallback:
      | ((data: { amount: number; x: number; y: number }) => void)
      | undefined;
    (EventBus.subscribe as any).mockImplementation(
      (event: string, cb: (data: { amount: number; x: number; y: number }) => void) => {
        if (event === 'playerHealed') healCallback = cb;
        return vi.fn();
      }
    );

    renderHook(() =>
      useGameEvents({
        pool: mockPool as any,
        state: mockState as any,
        spawnSystem: mockSpawnSystem as any,
      })
    );

    healCallback!({ amount: 10, x: 50, y: 50 });

    expect(mockPool.current.getFloatingText).toHaveBeenCalledWith(
      50,
      30,
      '+10',
      expect.any(String),
      20
    );
  });
});
