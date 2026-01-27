import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useHUDEvents } from '../../hooks/useHUDEvents';
import { EventBus } from '../../services/core/EventBus';
import { audio } from '../../services/audio';
import { GameStatus } from '../../types';

// Mock dependencies
vi.mock('../../services/core/EventBus', () => ({
  EventBus: {
    on: vi.fn(() => vi.fn()),
    emit: vi.fn(),
  },
}));

vi.mock('../../services/combat/ComboSystem', () => ({
  ComboSystem: {
    getMaxStreak: vi.fn().mockReturnValue(10),
  },
}));

vi.mock('../../services/audio', () => ({
  audio: {
    playComboMilestone: vi.fn(),
  },
}));

const mockPlayer = {
  hp: 100,
  maxHp: 100,
};

describe('useHUDEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() =>
      useHUDEvents(mockPlayer as any, GameStatus.PLAYING)
    );

    expect(result.current.uiMeta.milestoneText).toBe('');
    expect(result.current.showMilestone).toBe(false);
    expect(result.current.clutchActive).toBe(false);
    expect(result.current.flash).toBe(0);
  });

  it('should update uiMeta on comboUpdate', () => {
    let updateCallback: ((data: any) => void) | undefined;
    (EventBus.on as any).mockImplementation((event: string, cb: any) => {
      if (event === 'comboUpdate') updateCallback = cb;
      return vi.fn();
    });

    const { result } = renderHook(() =>
      useHUDEvents(mockPlayer as any, GameStatus.PLAYING)
    );

    act(() => {
      updateCallback!({ totalBonusXp: 500 });
    });

    expect(result.current.uiMeta.totalBonusXp).toBe(500);
    expect(result.current.uiMeta.maxStreak).toBe(10);
  });

  it('should show milestone on comboMilestone event', () => {
    let milestoneCallback: ((data: any) => void) | undefined;
    (EventBus.on as any).mockImplementation((event: string, cb: any) => {
      if (event === 'comboMilestone') milestoneCallback = cb;
      return vi.fn();
    });

    const { result } = renderHook(() =>
      useHUDEvents(mockPlayer as any, GameStatus.PLAYING)
    );

    act(() => {
      milestoneCallback!({
        name: 'DOMINATING',
        color: '#ff0000',
        sound: 'combo3',
      });
    });

    expect(result.current.showMilestone).toBe(true);
    expect(result.current.uiMeta.milestoneText).toBe('DOMINATING');
    expect(audio.playComboMilestone).toHaveBeenCalledWith('combo3');

    // Fast forward to hide
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(result.current.showMilestone).toBe(false);
  });

  it('should flash on levelUpStart', () => {
    let levelUpCallback: (() => void) | undefined;
    (EventBus.on as any).mockImplementation((event: string, cb: any) => {
      if (event === 'levelUpStart') levelUpCallback = cb;
      return vi.fn();
    });

    const { result } = renderHook(() =>
      useHUDEvents(mockPlayer as any, GameStatus.PLAYING)
    );

    act(() => {
      levelUpCallback!();
    });

    expect(result.current.flash).toBe(1.0);

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.flash).toBe(0);
  });

  describe('Clutch Mechanic', () => {
    it('should trigger clutch when recovering from critical HP (<20% -> >50%)', () => {
      const { result, rerender } = renderHook(
        ({ p }) => useHUDEvents(p as any, GameStatus.PLAYING),
        {
          initialProps: { p: { hp: 100, maxHp: 100 } },
        }
      );

      // Drop to critical
      act(() => {
        rerender({ p: { hp: 10, maxHp: 100 } }); // 10%
      });
      // Not yet active
      expect(result.current.clutchActive).toBe(false);

      // Heal to healthy
      act(() => {
        rerender({ p: { hp: 60, maxHp: 100 } }); // 60%
      });

      expect(result.current.clutchActive).toBe(true);

      // Timeout
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(result.current.clutchActive).toBe(false);
    });

    it('should defer clutch if leveling up', () => {
      const { result, rerender } = renderHook(({ p, s }) => useHUDEvents(p as any, s), {
        initialProps: { p: { hp: 100, maxHp: 100 }, s: GameStatus.PLAYING },
      });

      // Drop critical
      act(() => {
        rerender({ p: { hp: 10, maxHp: 100 }, s: GameStatus.PLAYING });
      });

      // Heal via Level Up (Status changes to LEVEL_UP)
      act(() => {
        rerender({ p: { hp: 100, maxHp: 100 }, s: GameStatus.LEVEL_UP });
      });

      // Should be pending, not active yet
      expect(result.current.clutchActive).toBe(false);

      // Return to playing
      act(() => {
        rerender({ p: { hp: 100, maxHp: 100 }, s: GameStatus.PLAYING });
      });

      expect(result.current.clutchActive).toBe(true);
    });
  });
});
