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
    current: { level: 1 },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default default behavior for EventBus.on
    (EventBus.on as any).mockReturnValue(() => {});
  });

  it('should transition to DATA_DISCONNECTED when processing timeout event in PLAYING state', () => {
    vi.spyOn(GameStateMachine, 'getState').mockReturnValue(GameStatus.PLAYING);
    renderHook(() => useMarketTimeout({ playerRef: mockPlayerRef }));

    const calls = (EventBus.on as any).mock.calls;
    const timeoutHandler = calls.find((c: any) => c[0] === 'marketDataTimeout')?.[1];

    expect(timeoutHandler).toBeDefined();

    timeoutHandler({ pair: 'BTC', disconnectedDuration: 35000 });

    expect(GameStateMachine.transition).toHaveBeenCalledWith(
      GameStatus.DATA_DISCONNECTED
    );
  });

  it('should NOT transition when processing timeout event in MENU state', () => {
    vi.spyOn(GameStateMachine, 'getState').mockReturnValue(GameStatus.MENU);
    renderHook(() => useMarketTimeout({ playerRef: mockPlayerRef }));

    const calls = (EventBus.on as any).mock.calls;
    const timeoutHandler = calls.find((c: any) => c[0] === 'marketDataTimeout')?.[1];

    timeoutHandler({ pair: 'BTC', disconnectedDuration: 35000 });

    expect(GameStateMachine.transition).not.toHaveBeenCalled();
  });

  it('should NOT transition when processing timeout event in PAUSED state', () => {
    vi.spyOn(GameStateMachine, 'getState').mockReturnValue(GameStatus.PAUSED);
    renderHook(() => useMarketTimeout({ playerRef: mockPlayerRef }));

    const calls = (EventBus.on as any).mock.calls;
    const timeoutHandler = calls.find((c: any) => c[0] === 'marketDataTimeout')?.[1];

    timeoutHandler({ pair: 'BTC', disconnectedDuration: 35000 });

    expect(GameStateMachine.transition).not.toHaveBeenCalled();
  });
});
