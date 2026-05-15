import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateMachine } from '../services/core/GameStateMachine';
import { EventBus } from '../services/core/EventBus';
import { GameStatus } from '../types';

describe('GameStateMachine', () => {
  beforeEach(() => {
    // Force reset to MENU state before each test
    GameStateMachine.forceState(GameStatus.MENU);
  });

  describe('Valid Transitions', () => {
    it('should transition from MENU to PLAYING', () => {
      expect(GameStateMachine.getState()).toBe(GameStatus.MENU);

      const result = GameStateMachine.transition(GameStatus.PLAYING);

      expect(result).toBe(true);
      expect(GameStateMachine.getState()).toBe(GameStatus.PLAYING);
    });

    it('should transition from PLAYING to PAUSED', () => {
      GameStateMachine.transition(GameStatus.PLAYING);

      const result = GameStateMachine.transition(GameStatus.PAUSED);

      expect(result).toBe(true);
      expect(GameStateMachine.getState()).toBe(GameStatus.PAUSED);
    });

    it('should transition from PLAYING to LEVEL_UP', () => {
      GameStateMachine.transition(GameStatus.PLAYING);

      const result = GameStateMachine.transition(GameStatus.LEVEL_UP);

      expect(result).toBe(true);
      expect(GameStateMachine.getState()).toBe(GameStatus.LEVEL_UP);
    });

    it('should transition from LEVEL_UP back to PLAYING', () => {
      GameStateMachine.transition(GameStatus.PLAYING);
      GameStateMachine.transition(GameStatus.LEVEL_UP);

      const result = GameStateMachine.transition(GameStatus.PLAYING);

      expect(result).toBe(true);
      expect(GameStateMachine.getState()).toBe(GameStatus.PLAYING);
    });

    it('should transition from PLAYING to GAMEOVER', () => {
      GameStateMachine.transition(GameStatus.PLAYING);

      const result = GameStateMachine.transition(GameStatus.GAMEOVER);

      expect(result).toBe(true);
      expect(GameStateMachine.getState()).toBe(GameStatus.GAMEOVER);
    });

    it('should transition from GAMEOVER to MENU', () => {
      GameStateMachine.transition(GameStatus.PLAYING);
      GameStateMachine.transition(GameStatus.GAMEOVER);

      const result = GameStateMachine.transition(GameStatus.MENU);

      expect(result).toBe(true);
      expect(GameStateMachine.getState()).toBe(GameStatus.MENU);
    });
  });

  describe('Invalid Transitions', () => {
    it('should reject transition from MENU to PAUSED', () => {
      expect(GameStateMachine.getState()).toBe(GameStatus.MENU);

      const result = GameStateMachine.transition(GameStatus.PAUSED);

      expect(result).toBe(false);
      expect(GameStateMachine.getState()).toBe(GameStatus.MENU);
    });

    it('should reject transition from MENU to LEVEL_UP', () => {
      const result = GameStateMachine.transition(GameStatus.LEVEL_UP);

      expect(result).toBe(false);
      expect(GameStateMachine.getState()).toBe(GameStatus.MENU);
    });

    it('should reject transition from MENU to CYCLE_COMPLETE', () => {
      const result = GameStateMachine.transition(GameStatus.CYCLE_COMPLETE);

      expect(result).toBe(false);
      expect(GameStateMachine.getState()).toBe(GameStatus.MENU);
    });

    it('should reject transition from GAMEOVER to PLAYING', () => {
      GameStateMachine.transition(GameStatus.PLAYING);
      GameStateMachine.transition(GameStatus.GAMEOVER);

      const result = GameStateMachine.transition(GameStatus.PLAYING);

      expect(result).toBe(false);
      expect(GameStateMachine.getState()).toBe(GameStatus.GAMEOVER);
    });

    it('should reject transition from PAUSED to LEVEL_UP', () => {
      GameStateMachine.transition(GameStatus.PLAYING);
      GameStateMachine.transition(GameStatus.PAUSED);

      const result = GameStateMachine.transition(GameStatus.LEVEL_UP);

      expect(result).toBe(false);
      expect(GameStateMachine.getState()).toBe(GameStatus.PAUSED);
    });
  });

  describe('canTransition', () => {
    it('should return true for valid transition', () => {
      expect(GameStateMachine.canTransition(GameStatus.PLAYING)).toBe(true);
    });

    it('should return false for invalid transition', () => {
      expect(GameStateMachine.canTransition(GameStatus.GAMEOVER)).toBe(false);
    });
  });

  describe('State History', () => {
    it('should track state transitions', () => {
      const historyBefore = GameStateMachine.getHistory().length;

      GameStateMachine.transition(GameStatus.PLAYING);
      GameStateMachine.transition(GameStatus.PAUSED);
      GameStateMachine.transition(GameStatus.PLAYING);

      const history = GameStateMachine.getHistory();

      // Should have 3 new entries
      expect(history.length).toBe(historyBefore + 3);

      // Check the last 3 entries
      const lastThree = history.slice(-3);
      expect(lastThree[0]?.from).toBe(GameStatus.MENU);
      expect(lastThree[0]?.to).toBe(GameStatus.PLAYING);
      expect(lastThree[1]?.from).toBe(GameStatus.PLAYING);
      expect(lastThree[1]?.to).toBe(GameStatus.PAUSED);
    });
  });

  describe('Subscription', () => {
    it('should notify subscribers on state change', () => {
      let notifiedState: GameStatus | null = null;

      const unsubscribe = GameStateMachine.subscribe(newState => {
        notifiedState = newState;
      });

      GameStateMachine.transition(GameStatus.PLAYING);

      expect(notifiedState).toBe(GameStatus.PLAYING);

      unsubscribe();
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
});
