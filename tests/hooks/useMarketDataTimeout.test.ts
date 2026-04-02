import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMarketDataTimeout } from '../../hooks/useMarketDataTimeout';
import { EventBus } from '../../services/core/EventBus';
import { GameStatus } from '../../types';

vi.mock('../../services/system/Logger', () => ({
  Logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

describe('useMarketDataTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    EventBus.clearEvent('marketTimeoutWarning');
    EventBus.clearEvent('marketDataTimeout');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const makeRefs = (
    overrides: {
      status?: GameStatus;
      lastPriceTime?: number;
    } = {}
  ) => ({
    gameStatusRef: { current: overrides.status ?? GameStatus.PLAYING },
    lastPriceTimeRef: { current: overrides.lastPriceTime ?? Date.now() },
    timeoutTriggeredRef: { current: false },
    pairRef: { current: 'BTC' },
  });

  it('does not emit warnings when price is fresh', () => {
    const emitSpy = vi.spyOn(EventBus, 'emit');
    const refs = makeRefs();
    renderHook(() => useMarketDataTimeout(refs));

    vi.advanceTimersByTime(5000);

    expect(emitSpy).not.toHaveBeenCalledWith('marketTimeoutWarning', expect.anything());
  });

  it('emits warning after 10s without price update', () => {
    const emitSpy = vi.spyOn(EventBus, 'emit');
    const refs = makeRefs({ lastPriceTime: Date.now() - 11_000 });
    renderHook(() => useMarketDataTimeout(refs));

    vi.advanceTimersByTime(1000);

    expect(emitSpy).toHaveBeenCalledWith(
      'marketTimeoutWarning',
      expect.objectContaining({ level: 'warning' })
    );
  });

  it('emits critical warning after 13s', () => {
    const emitSpy = vi.spyOn(EventBus, 'emit');
    const refs = makeRefs({ lastPriceTime: Date.now() - 14_000 });
    renderHook(() => useMarketDataTimeout(refs));

    vi.advanceTimersByTime(1000);

    expect(emitSpy).toHaveBeenCalledWith(
      'marketTimeoutWarning',
      expect.objectContaining({ level: 'critical' })
    );
  });

  it('emits marketDataTimeout after 15s', () => {
    const emitSpy = vi.spyOn(EventBus, 'emit');
    const refs = makeRefs({ lastPriceTime: Date.now() - 16_000 });
    renderHook(() => useMarketDataTimeout(refs));

    vi.advanceTimersByTime(1000);

    expect(emitSpy).toHaveBeenCalledWith(
      'marketDataTimeout',
      expect.objectContaining({ reason: 'market_timeout' })
    );
  });

  it('does not check timeout when game is paused', () => {
    const emitSpy = vi.spyOn(EventBus, 'emit');
    const refs = makeRefs({
      status: GameStatus.PAUSED,
      lastPriceTime: Date.now() - 20_000,
    });
    renderHook(() => useMarketDataTimeout(refs));

    vi.advanceTimersByTime(2000);

    expect(emitSpy).not.toHaveBeenCalledWith('marketDataTimeout', expect.anything());
  });

  it('clears interval on unmount', () => {
    const refs = makeRefs();
    const { unmount } = renderHook(() => useMarketDataTimeout(refs));

    const emitSpy = vi.spyOn(EventBus, 'emit');
    unmount();

    refs.lastPriceTimeRef.current = Date.now() - 20_000;
    vi.advanceTimersByTime(5000);

    expect(emitSpy).not.toHaveBeenCalledWith('marketDataTimeout', expect.anything());
  });
});
