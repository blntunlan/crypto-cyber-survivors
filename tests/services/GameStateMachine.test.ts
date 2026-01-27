import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameStateMachine } from '../../services/core/GameStateMachine';
import { GameStatus } from '../../types';
import { TimeService } from '../../services/core/TimeService';
import { EventBus } from '../../services/core/EventBus';

// Mock dependencies
vi.mock('../../services/core/TimeService', () => ({
  TimeService: {
    start: vi.fn(),
    pause: vi.fn(),
    reset: vi.fn(),
  },
}));

vi.mock('../../services/core/EventBus', () => ({
  EventBus: {
    emit: vi.fn(),
    on: vi.fn(), // If needed for constructor subscription
  },
}));

describe('GameStateMachine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Force reset for isolation
    GameStateMachine.forceState(GameStatus.MENU);
  });

  describe('Initialization', () => {
    it('should start in MENU state', () => {
      expect(GameStateMachine.getState()).toBe(GameStatus.MENU);
    });

    it('should be a singleton', () => {
      // Re-importing or getting instance usually handled by module system
      // Since we import the exported const, we check if it persists state
      GameStateMachine.forceState(GameStatus.PLAYING);
      expect(GameStateMachine.getState()).toBe(GameStatus.PLAYING);
    });
  });

  describe('Transitions', () => {
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
      GameStateMachine.transition(GameStatus.PLAYING);
      const history = GameStateMachine.getHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[history.length - 1]!.from).toBe(GameStatus.MENU);
      expect(history[history.length - 1]!.to).toBe(GameStatus.PLAYING);
    });
  });

  describe('TimeService Sync', () => {
    it('should start TimeService when entering PLAYING', () => {
      GameStateMachine.transition(GameStatus.PLAYING);
      expect(TimeService.start).toHaveBeenCalled();
    });

    it('should pause TimeService when entering PAUSED', () => {
      GameStateMachine.forceState(GameStatus.PLAYING);
      GameStateMachine.transition(GameStatus.PAUSED);
      expect(TimeService.pause).toHaveBeenCalled();
    });

    it('should reset TimeService when entering MENU', () => {
      GameStateMachine.forceState(GameStatus.GAMEOVER);
      GameStateMachine.transition(GameStatus.MENU);
      expect(TimeService.reset).toHaveBeenCalled();
    });
  });

  describe('Listeners', () => {
    it('should notify subscribers on change', () => {
      const callback = vi.fn();
      const unsubscribe = GameStateMachine.subscribe(callback);

      GameStateMachine.transition(GameStatus.PLAYING);

      expect(callback).toHaveBeenCalledWith(GameStatus.PLAYING, GameStatus.MENU);
      unsubscribe();
    });

    it('should emit settingsUpdate event', () => {
      GameStateMachine.transition(GameStatus.PLAYING);
      expect(EventBus.emit).toHaveBeenCalledWith('settingsUpdate', {
        gameStatus: GameStatus.PLAYING,
      });
    });
  });

  describe('Force State', () => {
    it('should bypass validation when forcing state', () => {
      expect(GameStateMachine.getState()).toBe(GameStatus.MENU);
      // Direct jump MENU -> PAUSED is normally invalid
      GameStateMachine.forceState(GameStatus.PAUSED);
      expect(GameStateMachine.getState()).toBe(GameStatus.PAUSED);
    });
  });
});
