import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStatus } from '../../hooks/useGameStatus';
import { GameStateMachine } from '../../services/core/GameStateMachine';
import { GameStatus } from '../../types';

describe('useGameStatus', () => {
  beforeEach(() => {
    GameStateMachine.forceState(GameStatus.MENU);
  });

  it('initializes from the current GameStateMachine state', () => {
    GameStateMachine.forceState(GameStatus.PAUSED);

    const { result } = renderHook(() => useGameStatus());

    expect(result.current.gameStatus).toBe(GameStatus.PAUSED);
  });

  it('subscribes through the external store API', () => {
    const { result } = renderHook(() => useGameStatus());

    expect(result.current.gameStatus).toBe(GameStatus.MENU);

    act(() => {
      GameStateMachine.transition(GameStatus.PLAYING);
    });

    expect(result.current.gameStatus).toBe(GameStatus.PLAYING);
  });
});
