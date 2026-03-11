import { describe, expect, it, vi } from 'vitest';
import {
  canTransitionGameplaySessionState,
  GameplaySessionOrchestrator,
  GameplaySessionState,
} from '../../../services/gameplay/orchestrator/GameplaySessionOrchestrator';

describe('GameplaySessionOrchestrator', () => {
  it('accepts each valid transition and updates state', () => {
    const validTransitions: Array<[GameplaySessionState, GameplaySessionState]> = [
      [GameplaySessionState.BOOT, GameplaySessionState.MAIN_MENU],
      [GameplaySessionState.MAIN_MENU, GameplaySessionState.RUN_LOADING],
      [GameplaySessionState.RUN_LOADING, GameplaySessionState.MAIN_MENU],
      [GameplaySessionState.RUN_LOADING, GameplaySessionState.RUN_ACTIVE],
      [GameplaySessionState.RUN_ACTIVE, GameplaySessionState.RUN_PAUSED],
      [GameplaySessionState.RUN_ACTIVE, GameplaySessionState.RUN_RESULTS],
      [GameplaySessionState.RUN_ACTIVE, GameplaySessionState.MAIN_MENU],
      [GameplaySessionState.RUN_PAUSED, GameplaySessionState.RUN_ACTIVE],
      [GameplaySessionState.RUN_PAUSED, GameplaySessionState.RUN_RESULTS],
      [GameplaySessionState.RUN_PAUSED, GameplaySessionState.MAIN_MENU],
      [GameplaySessionState.RUN_RESULTS, GameplaySessionState.MAIN_MENU],
      [GameplaySessionState.RUN_RESULTS, GameplaySessionState.RUN_LOADING],
    ];

    for (const [from, to] of validTransitions) {
      const orchestrator = new GameplaySessionOrchestrator({ initialState: from });

      expect(canTransitionGameplaySessionState(from, to)).toBe(true);
      expect(orchestrator.canTransition(to)).toBe(true);

      const result = orchestrator.transitionTo(to, 'valid-transition');

      expect(result.accepted).toBe(true);
      expect(result.transition?.from).toBe(from);
      expect(result.transition?.to).toBe(to);
      expect(result.transition?.reason).toBe('valid-transition');
      expect(typeof result.transition?.timestampMs).toBe('number');
      expect(orchestrator.getState()).toBe(to);
    }
  });

  it('rejects invalid transitions and preserves current state', () => {
    const onTransition = vi.fn();
    const orchestrator = new GameplaySessionOrchestrator({
      initialState: GameplaySessionState.BOOT,
      onTransition,
    });

    expect(orchestrator.canTransition(GameplaySessionState.RUN_ACTIVE)).toBe(false);

    const result = orchestrator.transitionTo(
      GameplaySessionState.RUN_ACTIVE,
      'skip-loading'
    );

    expect(result).toEqual({
      accepted: false,
      reason: 'Invalid session transition: boot -> run_active',
    });
    expect(orchestrator.getState()).toBe(GameplaySessionState.BOOT);
    expect(onTransition).not.toHaveBeenCalled();
  });

  it('uses injected now() in transition timestamp and callback payload', () => {
    const now = vi.fn().mockReturnValue(42_000);
    const onTransition = vi.fn();
    const orchestrator = new GameplaySessionOrchestrator({
      initialState: GameplaySessionState.RUN_LOADING,
      now,
      onTransition,
    });

    const result = orchestrator.transitionTo(
      GameplaySessionState.RUN_ACTIVE,
      'runtime-ready'
    );

    expect(result).toEqual({
      accepted: true,
      transition: {
        from: GameplaySessionState.RUN_LOADING,
        to: GameplaySessionState.RUN_ACTIVE,
        reason: 'runtime-ready',
        timestampMs: 42_000,
      },
    });
    expect(now).toHaveBeenCalledTimes(1);
    expect(onTransition).toHaveBeenCalledTimes(1);
    expect(onTransition).toHaveBeenCalledWith(result.transition);
  });

  it('resets to boot by default and can reset to an explicit state', () => {
    const orchestrator = new GameplaySessionOrchestrator({
      initialState: GameplaySessionState.RUN_ACTIVE,
    });

    orchestrator.reset();
    expect(orchestrator.getState()).toBe(GameplaySessionState.BOOT);

    orchestrator.reset(GameplaySessionState.RUN_RESULTS);
    expect(orchestrator.getState()).toBe(GameplaySessionState.RUN_RESULTS);
  });
});
