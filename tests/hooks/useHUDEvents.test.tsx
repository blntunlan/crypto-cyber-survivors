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
    playAchievementGlint: vi.fn(),
    playSlowdownTension: vi.fn(),
  },
}));

const mockPlayer = {
  hp: 100,
  maxHp: 100,
};

/** Capture EventBus.on callbacks by event name */
function captureCallbacks(): Map<string, (data: any) => void> {
  const callbacks = new Map<string, (data: any) => void>();
  (EventBus.on as any).mockImplementation((event: string, cb: any) => {
    callbacks.set(event, cb);
    return vi.fn();
  });
  return callbacks;
}

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

    expect(result.current.announcement).toBeNull();
    expect(result.current.uiMeta.maxStreak).toBe(0);
    expect(result.current.clutchActive).toBe(false);
    expect(result.current.flash).toBe(0);
  });

  it('should update uiMeta on comboUpdate', () => {
    const callbacks = captureCallbacks();

    const { result } = renderHook(() =>
      useHUDEvents(mockPlayer as any, GameStatus.PLAYING)
    );

    act(() => {
      callbacks.get('comboUpdate')!({ totalBonusXp: 500 });
    });

    expect(result.current.uiMeta.totalBonusXp).toBe(500);
    expect(result.current.uiMeta.maxStreak).toBe(10);
  });

  it('should show combo announcement on comboMilestone event', () => {
    const callbacks = captureCallbacks();

    const { result } = renderHook(() =>
      useHUDEvents(mockPlayer as any, GameStatus.PLAYING)
    );

    act(() => {
      callbacks.get('comboMilestone')!({
        name: 'DOMINATING',
        color: '#ff0000',
        sound: 'combo3',
      });
    });

    expect(result.current.announcement).toMatchObject({
      kind: 'combo',
      name: 'DOMINATING',
      color: '#ff0000',
    });
    expect(audio.playComboMilestone).toHaveBeenCalledWith('combo3');

    // Fast forward to hide (combo display duration)
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(result.current.announcement).toBeNull();
  });

  it('should replace an active combo in place and reset its timer', () => {
    const callbacks = captureCallbacks();

    const { result } = renderHook(() =>
      useHUDEvents(mockPlayer as any, GameStatus.PLAYING)
    );

    act(() => {
      callbacks.get('comboMilestone')!({ name: 'COMBO!', color: '#111' });
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    act(() => {
      callbacks.get('comboMilestone')!({ name: 'SUPER COMBO!', color: '#222' });
    });

    expect(result.current.announcement?.name).toBe('SUPER COMBO!');

    // Timer was reset: 2000ms later it is still visible, gone after 2500ms total
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.announcement?.name).toBe('SUPER COMBO!');
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.announcement).toBeNull();
  });

  describe('milestone announcement queue', () => {
    it('should show in-run milestones through the announcer', () => {
      const callbacks = captureCallbacks();

      const { result } = renderHook(() =>
        useHUDEvents(mockPlayer as any, GameStatus.PLAYING)
      );

      act(() => {
        callbacks.get('milestoneAchieved')!({
          id: 'time_60',
          name: '1 MINUTE!',
          nameKey: 'milestones.time_60',
          icon: '⏱️',
          color: '#22c55e',
          type: 'time',
          threshold: 60,
          severity: 'celebration',
          sound: 'glint',
        });
      });

      expect(result.current.announcement).toMatchObject({
        kind: 'milestone',
        name: '1 MINUTE!',
        nameKey: 'milestones.time_60',
      });
      expect(audio.playAchievementGlint).toHaveBeenCalled();
      // Not routed to the AchievementPopup path
      expect(result.current.achievement).toBeNull();
    });

    it('should queue simultaneous milestones and show them sequentially', () => {
      const callbacks = captureCallbacks();

      const { result } = renderHook(() =>
        useHUDEvents(mockPlayer as any, GameStatus.PLAYING)
      );

      act(() => {
        callbacks.get('milestoneAchieved')!({
          id: 'level_5',
          name: 'LEVEL 5',
          color: '#22c55e',
          type: 'level',
          threshold: 5,
        });
        callbacks.get('milestoneAchieved')!({
          id: 'time_60',
          name: '1 MINUTE!',
          color: '#3b82f6',
          type: 'time',
          threshold: 60,
        });
      });

      expect(result.current.announcement?.name).toBe('LEVEL 5');

      // First display window ends
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(result.current.announcement).toBeNull();

      // After the gap, the queued milestone shows
      act(() => {
        vi.advanceTimersByTime(150);
      });
      expect(result.current.announcement?.name).toBe('1 MINUTE!');

      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(result.current.announcement).toBeNull();
    });

    it('should drop the oldest pending entry beyond the queue cap', () => {
      const callbacks = captureCallbacks();

      const { result } = renderHook(() =>
        useHUDEvents(mockPlayer as any, GameStatus.PLAYING)
      );

      const emitMilestone = (id: string, name: string) =>
        callbacks.get('milestoneAchieved')!({
          id,
          name,
          color: '#fff',
          type: 'kills',
          threshold: 1,
        });

      act(() => {
        emitMilestone('m1', 'FIRST'); // shown immediately
        emitMilestone('m2', 'SECOND'); // pending
        emitMilestone('m3', 'THIRD'); // pending
        emitMilestone('m4', 'FOURTH'); // pending (cap = 3)
        emitMilestone('m5', 'FIFTH'); // pending overflows → SECOND dropped
      });

      expect(result.current.announcement?.name).toBe('FIRST');

      const shown: string[] = [];
      for (let i = 0; i < 4; i++) {
        act(() => {
          vi.advanceTimersByTime(2150);
        });
        if (result.current.announcement) {
          shown.push(result.current.announcement.name);
        }
      }
      expect(shown).toEqual(['THIRD', 'FOURTH', 'FIFTH']);
    });

    it('should play tension sound for danger announcements', () => {
      const callbacks = captureCallbacks();

      const { result } = renderHook(() =>
        useHUDEvents(mockPlayer as any, GameStatus.PLAYING)
      );

      act(() => {
        callbacks.get('milestoneAchieved')!({
          id: 'danger_10',
          name: 'DRAWDOWN ALERT',
          color: '#FF3D00',
          type: 'danger',
          threshold: -0.1,
          severity: 'danger',
          sound: 'tension',
        });
      });

      expect(result.current.announcement?.kind).toBe('danger');
      expect(audio.playSlowdownTension).toHaveBeenCalled();
    });

    it('should keep non-run milestone types on the achievement popup path', () => {
      const callbacks = captureCallbacks();

      const { result } = renderHook(() =>
        useHUDEvents(mockPlayer as any, GameStatus.PLAYING)
      );

      act(() => {
        callbacks.get('milestoneAchieved')!({
          id: 'srv_1',
          name: 'First Blood',
          icon: '⚔️',
          color: '#fff',
          type: 'combat',
          threshold: 1,
        });
      });

      expect(result.current.achievement).toMatchObject({ name: 'First Blood' });
      expect(result.current.announcement).toBeNull();
    });

    it('should clear queue and announcement on gameReset', () => {
      const callbacks = captureCallbacks();

      const { result } = renderHook(() =>
        useHUDEvents(mockPlayer as any, GameStatus.PLAYING)
      );

      act(() => {
        callbacks.get('milestoneAchieved')!({
          id: 'time_60',
          name: '1 MINUTE!',
          color: '#22c55e',
          type: 'time',
          threshold: 60,
        });
        callbacks.get('milestoneAchieved')!({
          id: 'level_5',
          name: 'LEVEL 5',
          color: '#3b82f6',
          type: 'level',
          threshold: 5,
        });
      });
      expect(result.current.announcement).not.toBeNull();

      act(() => {
        callbacks.get('gameReset')!({});
      });
      expect(result.current.announcement).toBeNull();

      // Nothing queued resurfaces after timers run out
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(result.current.announcement).toBeNull();
    });
  });

  it('should flash on levelUpStart', () => {
    const callbacks = captureCallbacks();

    const { result } = renderHook(() =>
      useHUDEvents(mockPlayer as any, GameStatus.PLAYING)
    );

    act(() => {
      callbacks.get('levelUpStart')!({});
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
