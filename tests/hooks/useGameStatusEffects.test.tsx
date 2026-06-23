import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGameStatusEffects } from '../../hooks/useGameStatusEffects';
import { GameStatus } from '../../types';
import { BuffManager } from '../../services/patterns/decorators/BuffManager';
import { BuffGemSpawner } from '../../services/spawners/BuffGemSpawner';

// Mock dependencies
vi.mock('../../services/patterns/decorators/BuffManager', () => ({
  BuffManager: {
    initialize: vi.fn(),
    reset: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    isInitialized: vi.fn().mockReturnValue(false),
    isPaused: vi.fn().mockReturnValue(false),
  },
}));

vi.mock('../../services/spawners/BuffGemSpawner', () => ({
  BuffGemSpawner: {
    initialize: vi.fn(),
  },
}));

const mockPool = {
  current: {
    clearAll: vi.fn(),
  },
};

const mockState = {
  current: {
    lastTime: 100,
    spawnTimer: 50,
    lastFireTime: 50,
    shake: 10,
    critFlash: 1,
  },
};

const mockPlayer = {
  current: {
    x: 100,
    y: 100,
    radius: 10,
    active: true,
  },
};

describe('useGameStatusEffects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.current.lastTime = 100;
    mockState.current.spawnTimer = 50;
    mockState.current.lastFireTime = 50;
    mockState.current.shake = 10;
    mockState.current.critFlash = 1;
    mockPlayer.current.x = 100;
    mockPlayer.current.y = 100;
  });

  it('resets the time tracker on any status change', () => {
    renderHook(() =>
      useGameStatusEffects({
        status: GameStatus.MENU,
        pool: mockPool as any,
        state: mockState as any,
        playerRef: mockPlayer as any,
        width: 800,
        height: 600,
      })
    );

    expect(mockState.current.lastTime).toBe(0);
  });

  it('does NOT perform MENU cleanup here (GameEngine is unmounted at MENU)', () => {
    // Cross-run cleanup is owned by canonical reset paths (ResetOrchestrator
    // for the pool, `gameReset` subscribers for BuffManager/WeaponSystem),
    // NOT by this hook — its host component never renders while in MENU.
    // A MENU branch here would be dead code and previously masked weapon leaks.
    renderHook(() =>
      useGameStatusEffects({
        status: GameStatus.MENU,
        pool: mockPool as any,
        state: mockState as any,
        playerRef: mockPlayer as any,
        width: 800,
        height: 600,
      })
    );

    expect(mockPool.current.clearAll).not.toHaveBeenCalled();
    expect(BuffManager.reset).not.toHaveBeenCalled();
    expect(mockState.current.spawnTimer).toBe(50); // untouched
  });

  it('should initialize BuffManager when entering PLAYING', () => {
    (BuffManager.isInitialized as any).mockReturnValue(false);

    renderHook(() =>
      useGameStatusEffects({
        status: GameStatus.PLAYING,
        pool: mockPool as any,
        state: mockState as any,
        playerRef: mockPlayer as any,
        width: 800,
        height: 600,
      })
    );

    expect(BuffManager.initialize).toHaveBeenCalledWith(mockPlayer.current);
    expect(BuffGemSpawner.initialize).toHaveBeenCalledWith(800, 600);
  });

  it('should pause BuffManager and reset visual effects when PAUSED', () => {
    renderHook(() =>
      useGameStatusEffects({
        status: GameStatus.PAUSED,
        pool: mockPool as any,
        state: mockState as any,
        playerRef: mockPlayer as any,
        width: 800,
        height: 600,
      })
    );

    expect(BuffManager.pause).toHaveBeenCalled();
    expect(mockState.current.shake).toBe(0);
    expect(mockState.current.critFlash).toBe(0);
  });

  it('should reset visual effects when LEVEL_UP', () => {
    renderHook(() =>
      useGameStatusEffects({
        status: GameStatus.LEVEL_UP,
        pool: mockPool as any,
        state: mockState as any,
        playerRef: mockPlayer as any,
        width: 800,
        height: 600,
      })
    );

    expect(BuffManager.pause).toHaveBeenCalled();
    expect(mockState.current.shake).toBe(0);
    expect(mockState.current.critFlash).toBe(0);
  });

  it('should clamp player position on resize', () => {
    mockPlayer.current.x = 900; // Outside new width
    mockPlayer.current.y = 700; // Outside new height

    renderHook(() =>
      useGameStatusEffects({
        status: GameStatus.PAUSED,
        pool: mockPool as any,
        state: mockState as any,
        playerRef: mockPlayer as any,
        width: 800,
        height: 600,
      })
    );

    expect(mockPlayer.current.x).toBe(790); // 800 - 10
    expect(mockPlayer.current.y).toBe(590); // 600 - 10
  });
});
