/**
 * GameStateMachine - Unified Game State Controller
 *
 * Manages all game state transitions in a single, predictable location.
 * Prevents invalid transitions (e.g., leveling up while dead).
 * Automatically coordinates TimeService and other systems on state changes.
 */

import { GameStatus } from '../../types';
import { TimeService } from './TimeService';
import { EventBus } from './EventBus';
import { Logger } from '../system/Logger';

export interface StateTransition {
  from: GameStatus;
  to: GameStatus;
  timestamp: number;
}

type StateChangeCallback = (newState: GameStatus, oldState: GameStatus) => void;

class GameStateMachineClass {
  private static instance: GameStateMachineClass | null = null;

  private currentState: GameStatus = GameStatus.MENU;
  private stateHistory: StateTransition[] = [];
  private listeners: Set<StateChangeCallback> = new Set();

  // Define valid transitions
  private readonly VALID_TRANSITIONS: Map<GameStatus, GameStatus[]> = new Map([
    [GameStatus.MENU, [GameStatus.PLAYING, GameStatus.DATA_DISCONNECTED]],
    [
      GameStatus.PLAYING,
      [
        GameStatus.PAUSED,
        GameStatus.LEVEL_UP,
        GameStatus.GAMEOVER,
        GameStatus.CYCLE_COMPLETE,
        GameStatus.DATA_DISCONNECTED,
      ],
    ],
    [GameStatus.PAUSED, [GameStatus.PLAYING, GameStatus.MENU]],
    [GameStatus.LEVEL_UP, [GameStatus.PLAYING, GameStatus.GAMEOVER]],
    [GameStatus.GAMEOVER, [GameStatus.MENU]],
    [GameStatus.CYCLE_COMPLETE, [GameStatus.PLAYING, GameStatus.GAMEOVER]],
    [GameStatus.DATA_DISCONNECTED, [GameStatus.MENU, GameStatus.PLAYING]],
  ]);

  private constructor() {
    this.setupListeners();
  }

  static getInstance(): GameStateMachineClass {
    return (GameStateMachineClass.instance ??= new GameStateMachineClass());
  }

  private setupListeners(): void {
    EventBus.on('gameReset', () => {
      const oldState = this.currentState;
      this.currentState = GameStatus.MENU;
      this.stateHistory = [];
      this.publishStateChange(GameStatus.MENU, oldState);
    });
  }

  private publishStateChange(newState: GameStatus, oldState: GameStatus): void {
    this.syncTimeService(newState);
    this.listeners.forEach(cb => cb(newState, oldState));
    EventBus.emit('settingsUpdate', { gameStatus: newState });
  }

  /**
   * Attempt to transition to a new state.
   * Returns true if successful, false if the transition is invalid.
   */
  transition(newState: GameStatus): boolean {
    const validTargets = this.VALID_TRANSITIONS.get(this.currentState);

    if (!validTargets?.includes(newState)) {
      Logger.warn(
        `[GameStateMachine] Invalid transition: ${this.currentState} -> ${newState}`
      );
      return false;
    }

    const oldState = this.currentState;
    this.currentState = newState;

    // Record history
    this.stateHistory.push({
      from: oldState,
      to: newState,
      timestamp: Date.now(),
    });

    // Keep history manageable
    if (this.stateHistory.length > 50) {
      this.stateHistory.shift();
    }

    this.publishStateChange(newState, oldState);

    return true;
  }

  /**
   * Sync TimeService based on the new game state.
   */
  private syncTimeService(state: GameStatus): void {
    switch (state) {
      case GameStatus.PLAYING:
        TimeService.start();
        break;
      case GameStatus.PAUSED:
      case GameStatus.LEVEL_UP:
      case GameStatus.GAMEOVER:
      case GameStatus.CYCLE_COMPLETE:
      case GameStatus.DATA_DISCONNECTED:
        TimeService.pause();
        break;
      case GameStatus.MENU:
        TimeService.reset();
        break;
    }
  }

  /**
   * Get the current game state.
   */
  getState(): GameStatus {
    return this.currentState;
  }

  /**
   * Check if a transition to the target state is valid.
   */
  canTransition(targetState: GameStatus): boolean {
    const validTargets = this.VALID_TRANSITIONS.get(this.currentState);
    return validTargets?.includes(targetState) ?? false;
  }

  /**
   * Subscribe to state changes.
   */
  subscribe(callback: StateChangeCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Get state transition history for debugging.
   */
  getHistory(): StateTransition[] {
    return [...this.stateHistory];
  }

  /**
   * Force a state (use with caution, bypasses validation).
   * Primarily for testing or recovery scenarios.
   */
  forceState(state: GameStatus): void {
    Logger.warn(`[GameStateMachine] Force setting state to: ${state}`);
    const oldState = this.currentState;
    this.currentState = state;
    this.publishStateChange(state, oldState);
  }
}

export const GameStateMachine = GameStateMachineClass.getInstance();
