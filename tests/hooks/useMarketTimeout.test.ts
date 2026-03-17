import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMarketTimeout } from '../../hooks/useMarketTimeout';
import { EventBus } from '../../services/core/EventBus';
import { GameStateMachine } from '../../services/core/GameStateMachine';
import { GameStatus } from '../../types';

vi.mock('../../services/core/EventBus');
vi.mock('../../services/core/GameStateMachine');
vi.mock('../../services/system/Logger');
vi.mock('../../services/analytics/ErrorReporter', () => ({
  ErrorReporter: {
    report: vi.fn(),
  },
}));

// Mock DifficultyManager
vi.mock('../../services/gameplay/DifficultyManager', () => ({
  DifficultyManager: {
    getTotalElapsedSeconds: vi.fn().mockReturnValue(100),
  },
}));

describe('useMarketTimeout', () => {
  const mockPlayerRef = {
    current: { level: 1, pnl: 0 },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default default behavior for EventBus.on
    (EventBus.on as any).mockReturnValue(() => {});
  });

  it('should transition to DATA_DISCONNECTED when disconnect is under 15 seconds', () => {
    vi.spyOn(GameStateMachine, 'getState').mockReturnValue(GameStatus.PLAYING);
    renderHook(() => useMarketTimeout({ playerRef: mockPlayerRef }));

    const calls = (EventBus.on as any).mock.calls;
    const timeoutHandler = calls.find((c: any) => c[0] === 'marketDataTimeout')?.[1];

    expect(timeoutHandler).toBeDefined();

    // Under 10 seconds - should pause, not end game
    timeoutHandler({
      pair: 'BTC',
      disconnectedDuration: 5000,
      lastPriceTime: Date.now() - 5000,
    });

    expect(GameStateMachine.transition).toHaveBeenCalledWith(
      GameStatus.DATA_DISCONNECTED
    );
  });

  it('should transition to DATA_DISCONNECTED (not GAMEOVER) at 15-29s disconnect', () => {
    vi.spyOn(GameStateMachine, 'getState').mockReturnValue(GameStatus.PLAYING);
    renderHook(() => useMarketTimeout({ playerRef: mockPlayerRef }));

    const calls = (EventBus.on as any).mock.calls;
    const timeoutHandler = calls.find((c: any) => c[0] === 'marketDataTimeout')?.[1];

    expect(timeoutHandler).toBeDefined();

    // 20s — should pause, NOT end game (fatal threshold is 30s)
    timeoutHandler({
      pair: 'BTC',
      disconnectedDuration: 20000,
      lastPriceTime: Date.now() - 20000,
    });

    expect(GameStateMachine.transition).toHaveBeenCalledWith(
      GameStatus.DATA_DISCONNECTED
    );
    expect(EventBus.emit).not.toHaveBeenCalledWith('gameOver', expect.anything());
  });

  it('should transition to GAMEOVER when disconnect is 30+ seconds (fatal)', () => {
    vi.spyOn(GameStateMachine, 'getState').mockReturnValue(GameStatus.PLAYING);
    renderHook(() => useMarketTimeout({ playerRef: mockPlayerRef }));

    const calls = (EventBus.on as any).mock.calls;
    const timeoutHandler = calls.find((c: any) => c[0] === 'marketDataTimeout')?.[1];

    expect(timeoutHandler).toBeDefined();

    // 30+ seconds — fatal disconnect, game should end
    timeoutHandler({
      pair: 'BTC',
      disconnectedDuration: 30000,
      lastPriceTime: Date.now() - 30000,
    });

    expect(EventBus.emit).toHaveBeenCalledWith(
      'gameOver',
      expect.objectContaining({
        reason: 'DISCONNECT',
      })
    );
    expect(GameStateMachine.transition).toHaveBeenCalledWith(GameStatus.GAMEOVER);
  });

  it('should NOT transition when processing timeout event in MENU state', () => {
    vi.spyOn(GameStateMachine, 'getState').mockReturnValue(GameStatus.MENU);
    renderHook(() => useMarketTimeout({ playerRef: mockPlayerRef }));

    const calls = (EventBus.on as any).mock.calls;
    const timeoutHandler = calls.find((c: any) => c[0] === 'marketDataTimeout')?.[1];

    timeoutHandler({
      pair: 'BTC',
      disconnectedDuration: 35000,
      lastPriceTime: Date.now() - 35000,
    });

    expect(GameStateMachine.transition).not.toHaveBeenCalled();
  });

  it('should NOT transition when processing timeout event in PAUSED state', () => {
    vi.spyOn(GameStateMachine, 'getState').mockReturnValue(GameStatus.PAUSED);
    renderHook(() => useMarketTimeout({ playerRef: mockPlayerRef }));

    const calls = (EventBus.on as any).mock.calls;
    const timeoutHandler = calls.find((c: any) => c[0] === 'marketDataTimeout')?.[1];

    timeoutHandler({
      pair: 'BTC',
      disconnectedDuration: 35000,
      lastPriceTime: Date.now() - 35000,
    });

    expect(GameStateMachine.transition).not.toHaveBeenCalled();
  });

  it('should resume game on marketDataRecovered when in DATA_DISCONNECTED state', () => {
    vi.spyOn(GameStateMachine, 'getState').mockReturnValue(
      GameStatus.DATA_DISCONNECTED
    );
    renderHook(() => useMarketTimeout({ playerRef: mockPlayerRef }));

    const calls = (EventBus.on as any).mock.calls;
    const recoveredHandler = calls.find(
      (c: any) => c[0] === 'marketDataRecovered'
    )?.[1];

    expect(recoveredHandler).toBeDefined();

    recoveredHandler({ pair: 'BTC' });

    expect(GameStateMachine.transition).toHaveBeenCalledWith(GameStatus.PLAYING);
  });
});
