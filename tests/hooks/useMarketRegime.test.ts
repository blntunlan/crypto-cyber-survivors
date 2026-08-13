import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMarketRegime } from '../../hooks/useMarketRegime';
import { EventBus } from '../../services/core/EventBus';
import { audio } from '../../services/audio';
import { MARKET_REGIME_TELEGRAPH } from '../../config/MarketRegimeTelegraph';

vi.mock('../../services/audio', () => ({
  audio: {
    playWhaleArrival: vi.fn(),
    playSelectionTick: vi.fn(),
  },
}));

const commit = (regime: string) => {
  EventBus.emit('difficultySnapshotCommitted', {
    snapshot: { signals: { market: { regime } } },
  } as never);
};

describe('useMarketRegime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts calm and silent', () => {
    const { result } = renderHook(() => useMarketRegime());

    expect(result.current.regime).toBe('CALM');
    expect(result.current.shiftKey).toBe(0);
    expect(result.current.isShifting).toBe(false);
    expect(audio.playSelectionTick).not.toHaveBeenCalled();
  });

  it('telegraphs a regime shift with a cue and a pulse', () => {
    const { result } = renderHook(() => useMarketRegime());

    act(() => commit('PANIC'));

    expect(result.current.regime).toBe('PANIC');
    expect(result.current.shiftKey).toBe(1);
    expect(result.current.isShifting).toBe(true);
    // PANIC is an alert regime -> the heavier cue.
    expect(audio.playWhaleArrival).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(MARKET_REGIME_TELEGRAPH.pulseMs + 10);
    });
    expect(result.current.isShifting).toBe(false);
    expect(result.current.regime).toBe('PANIC');
  });

  it('uses the light cue for a quiet regime', () => {
    const { result } = renderHook(() => useMarketRegime());

    act(() => commit('BULL_TREND'));

    expect(result.current.regime).toBe('BULL_TREND');
    expect(audio.playSelectionTick).toHaveBeenCalledTimes(1);
    expect(audio.playWhaleArrival).not.toHaveBeenCalled();
  });

  it('ignores repeated commits of the same regime', () => {
    const { result } = renderHook(() => useMarketRegime());

    act(() => commit('VOLATILE'));
    act(() => commit('VOLATILE'));
    act(() => commit('VOLATILE'));

    expect(result.current.shiftKey).toBe(1);
  });

  it('does not strobe when the tape oscillates across a threshold', () => {
    const { result } = renderHook(() => useMarketRegime());

    act(() => commit('VOLATILE'));
    expect(result.current.shiftKey).toBe(1);

    // Second flip lands inside the minimum interval — no cue, no pulse.
    act(() => commit('CALM'));
    expect(result.current.shiftKey).toBe(1);
    expect(audio.playSelectionTick).not.toHaveBeenCalled();
  });

  it('returns to calm on game reset', () => {
    const { result } = renderHook(() => useMarketRegime());

    act(() => commit('PANIC'));
    act(() => {
      EventBus.emit('gameReset', undefined as never);
    });

    expect(result.current.regime).toBe('CALM');
    expect(result.current.shiftKey).toBe(0);
  });

  it('stays silent when disabled', () => {
    const { result } = renderHook(() => useMarketRegime(false));

    act(() => commit('PANIC'));

    expect(result.current.regime).toBe('CALM');
    expect(audio.playWhaleArrival).not.toHaveBeenCalled();
  });
});
