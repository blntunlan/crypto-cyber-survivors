import { type Player, type GameState } from '../types';
import { type PoolManager } from './PoolManager';
import { bulletGrid, enemyGrid } from './SpatialGrid';
import { MovementSystem } from './physics/MovementSystem';
import { CollisionSystem } from './physics/CollisionSystem';
import { CollectionSystem } from './physics/CollectionSystem';

/**
 * PhysicsSystem - Orchestrates all physical simulations and interactions.
 *
 * This is a high-level coordinator that delegates specific tasks to specialized systems:
 * - MovementSystem: Positional updates and trails
 * - CollisionSystem: Entity-to-entity physical interactions
 * - CollectionSystem: Player-item interactions (gems, buffs)
 */
export class PhysicsSystem {
  /**
   * Update positions and lifetimes for all moving entities.
   */
  public static updateEntities(
    p: PoolManager,
    dtFactor: number,
    width: number,
    height: number,
    player: Player
  ): void {
    MovementSystem.update(p, dtFactor, width, height, player);
  }

  /**
   * Main collision and interaction handler.
   */
  public static handleCollisions(
    p: PoolManager,
    player: Player,
    s: GameState,
    dtFactor: number,
    width: number,
    height: number,
    onGameOver: () => void
  ): void {
    // 1. Refresh Spatial Grids for optimized collision detection
    this.refreshSpatialGrids(p);

    // 2. Resolve Collisions (Player vs Enemy, Bullet vs Enemy)
    CollisionSystem.update(p, player, s, dtFactor, width, height, onGameOver);

    // 3. Resolve Collections (Player vs Gems/Buffs)
    CollectionSystem.update(p, player, s, dtFactor);
  }

  /**
   * Rebuild spatial hash grids with current active entities.
   */
  private static refreshSpatialGrids(p: PoolManager): void {
    bulletGrid.clear();
    enemyGrid.clear();

    bulletGrid.insertAll(p.activeBullets);
    enemyGrid.insertAll(p.activeEnemies);
  }
}
