import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameStateMachine } from '../../services/core/GameStateMachine';
import { GameStatus } from '../../types';
import { TimeService } from '../../services/core/TimeService';
import { EventBus } from '../../services/core/EventBus';

describe('GameStateMachine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Force reset for isolation
    GameStateMachine.forceState(GameStatus.MENU);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should start in MENU state', () => {
      expect(GameStateMachine.getState()).toBe(GameStatus.MENU);
    });

    it('should be a singleton', () => {
      GameStateMachine.forceState(GameStatus.PLAYING);
      expect(GameStateMachine.getState()).toBe(GameStatus.PLAYING);
    });
  });

  describe('Transitions & History', () => {
    it('should allow valid transition MENU -> PLAYING', () => {
      const success = GameStateMachine.transition(GameStatus.PLAYING);
      expect(success).toBe(true);
      expect(GameStateMachine.getState()).toBe(GameStatus.PLAYING);
    });

    it('should block invalid transition MENU -> PAUSED', () => {
      const success = GameStateMachine.transition(GameStatus.PAUSED);
      expect(success).toBe(false);
      expect(GameStateMachine.getState()).toBe(GameStatus.MENU);
    });

    it('should record state history', () => {
      const historyBefore = GameStateMachine.getHistory().length;
      GameStateMachine.transition(GameStatus.PLAYING);
      const history = GameStateMachine.getHistory();
      expect(history.length).toBe(historyBefore + 1);
      expect(history[history.length - 1]!.from).toBe(GameStatus.MENU);
      expect(history[history.length - 1]!.to).toBe(GameStatus.PLAYING);
    });

    it('should reject transition from GAMEOVER to PLAYING', () => {
      GameStateMachine.transition(GameStatus.PLAYING);
      GameStateMachine.transition(GameStatus.GAMEOVER);

      const result = GameStateMachine.transition(GameStatus.PLAYING);
      expect(result).toBe(false);
      expect(GameStateMachine.getState()).toBe(GameStatus.GAMEOVER);
    });
  });

  describe('TimeService Sync', () => {
    it('should start TimeService when entering PLAYING', () => {
      const startSpy = vi.spyOn(TimeService, 'start').mockImplementation(() => {});
      GameStateMachine.transition(GameStatus.PLAYING);
      expect(startSpy).toHaveBeenCalled();
    });

    it('should pause TimeService when entering PAUSED', () => {
      const pauseSpy = vi.spyOn(TimeService, 'pause').mockImplementation(() => {});
      GameStateMachine.forceState(GameStatus.PLAYING);
      GameStateMachine.transition(GameStatus.PAUSED);
      expect(pauseSpy).toHaveBeenCalled();
    });

    it('should reset TimeService when entering MENU', () => {
      const resetSpy = vi.spyOn(TimeService, 'reset').mockImplementation(() => {});
      GameStateMachine.forceState(GameStatus.GAMEOVER);
      GameStateMachine.transition(GameStatus.MENU);
      expect(resetSpy).toHaveBeenCalled();
    });
  });

  describe('Listeners & Subscriptions', () => {
    it('should notify subscribers on change', () => {
      const callback = vi.fn();
      const unsubscribe = GameStateMachine.subscribe(callback);

      GameStateMachine.transition(GameStatus.PLAYING);

      expect(callback).toHaveBeenCalledWith(GameStatus.PLAYING, GameStatus.MENU);
      unsubscribe();
    });

    it('should emit settingsUpdate event', () => {
      const emitSpy = vi.spyOn(EventBus, 'emit');
      GameStateMachine.transition(GameStatus.PLAYING);
      expect(emitSpy).toHaveBeenCalledWith('settingsUpdate', {
        gameStatus: GameStatus.PLAYING,
      });
    });

    it('notifies subscribers when gameReset forces MENU', () => {
      GameStateMachine.transition(GameStatus.PLAYING);
      let notifiedState: GameStatus | null = null;

      const unsubscribe = GameStateMachine.subscribe(newState => {
        notifiedState = newState;
      });

      EventBus.emit('gameReset', {});

      expect(GameStateMachine.getState()).toBe(GameStatus.MENU);
      expect(notifiedState).toBe(GameStatus.MENU);

      unsubscribe();
    });
  });

  describe('Force State', () => {
    it('should bypass validation when forcing state', () => {
      expect(GameStateMachine.getState()).toBe(GameStatus.MENU);
      // Direct jump MENU -> PAUSED is normally invalid
      GameStateMachine.forceState(GameStatus.PAUSED);
      expect(GameStateMachine.getState()).toBe(GameStatus.PAUSED);
    });

    it('should emit settingsUpdate when forcing state', () => {
      const emitSpy = vi.spyOn(EventBus, 'emit');
      GameStateMachine.forceState(GameStatus.PAUSED);

      expect(emitSpy).toHaveBeenCalledWith('settingsUpdate', {
        gameStatus: GameStatus.PAUSED,
      });
    });
  });
});
