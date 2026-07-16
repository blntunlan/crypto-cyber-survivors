import { type Player, type GameState } from '../../types';
import { type IPoolManager } from './IPoolManager';

/**
 * Interface for the Physics System.
 * Orchestrates movement, collisions, and collections.
 */
export interface IPhysicsSystem {
  /**
   * Update positions and lifetimes for all moving entities.
   */
  updateEntities(
    pool: IPoolManager,
    dtFactor: number,
    width: number,
    height: number,
    player: Player
  ): void;

  /**
   * Main collision and interaction handler.
   */
  handleCollisions(
    pool: IPoolManager,
    player: Player,
    state: GameState,
    dtFactor: number,
    width: number,
    height: number,
    onGameOver: () => void,
    reducedMotion?: boolean
  ): void;
}
