import { type Player, type GameState } from '../../types';
import { type IPoolManager } from '../interfaces/IPoolManager';
import { bulletGrid, enemyGrid } from './SpatialGrid';
import { MovementSystem } from './physics/MovementSystem';
import { CollisionSystem } from './physics/CollisionSystem';
import { CollectionSystem } from './physics/CollectionSystem';
import { type IPhysicsSystem } from '../interfaces/IPhysicsSystem';
import {
  type IMovementSystem,
  type ICollisionSystem,
  type ICollectionSystem,
} from '../interfaces/IPhysicsSubsystems';

/**
 * PhysicsSystem - Orchestrates all physical simulations and interactions.
 */
export class PhysicsSystem implements IPhysicsSystem {
  private static instance: PhysicsSystem | null = null;
  private movementSystem: IMovementSystem;
  private collisionSystem: ICollisionSystem;
  private collectionSystem: ICollectionSystem;

  constructor(
    movement: IMovementSystem = new MovementSystem(),
    collision: ICollisionSystem = CollisionSystem.getInstance(),
    collection: ICollectionSystem = new CollectionSystem()
  ) {
    this.movementSystem = movement;
    this.collisionSystem = collision;
    this.collectionSystem = collection;
  }

  /**
   * Get the singleton instance of PhysicsSystem
   */
  public static getInstance(): PhysicsSystem {
    return (PhysicsSystem.instance ??= new PhysicsSystem());
  }

  public static resetInstance(): void {
    PhysicsSystem.instance = null;
  }

  /**
   * Update positions and lifetimes for all moving entities.
   */
  public updateEntities(
    p: IPoolManager,
    dtFactor: number,
    width: number,
    height: number,
    player: Player
  ): void {
    this.movementSystem.update(p, dtFactor, width, height, player);
  }

  /**
   * Main collision and interaction handler.
   */
  public handleCollisions(
    p: IPoolManager,
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
    this.collisionSystem.update(p, player, s, dtFactor, width, height, onGameOver);

    // 3. Resolve Collections (Player vs Gems/Buffs)
    this.collectionSystem.update(p, player, s, dtFactor);
  }

  /**
   * Rebuild spatial hash grids with current active entities.
   * Grids are rebuilt every frame to reflect current positions of moving entities.
   */
  private refreshSpatialGrids(p: IPoolManager): void {
    // Note: Always rebuild every frame because positions change constantly.
    // The cost of O(N) rebuild is much lower than the correctness issues of stale grids.
    bulletGrid.clear();
    enemyGrid.clear();

    bulletGrid.insertAll(p.activeBullets);
    enemyGrid.insertAll(p.activeEnemies);
  }
}
