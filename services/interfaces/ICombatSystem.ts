import { type Player, type GameState } from '../../types';
import { type IPoolManager } from './IPoolManager';

/**
 * Interface for the Combat System.
 * Handles auto-firing, targeting, and projectile spawning.
 */
export interface ICombatSystem {
  /**
   * Process auto-fire logic for the player.
   *
   * @param pool - The pool manager containing active entities
   * @param player - The player entity
   * @param state - Current game state
   * @param deltaMs - Time since last frame in milliseconds
   * @param screenWidth - Optional screen width for on-screen targeting
   * @param screenHeight - Optional screen height for on-screen targeting
   */
  processAutoFire(
    pool: IPoolManager,
    player: Player,
    state: GameState,
    deltaMs: number,
    screenWidth?: number,
    screenHeight?: number
  ): void;
}
