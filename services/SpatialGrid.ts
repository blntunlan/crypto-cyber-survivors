/**
 * SpatialGrid - Simple spatial hash grid for collision optimization
 *
 * Divides the game world into cells and only checks collisions
 * between entities in the same or neighboring cells.
 * Reduces O(n×m) to approximately O(n+m) in practice.
 */

import { Bullet, Enemy } from '../types';

export class SpatialGrid<T extends { x: number; y: number; active: boolean }> {
  private cellSize: number;
  private grid: Map<string, T[]>;

  constructor(cellSize: number = 100) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  /**
   * Clear the grid for a new frame
   */
  public clear(): void {
    this.grid.clear();
  }

  /**
   * Get the cell key for a position
   */
  private getCellKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }

  /**
   * Insert an entity into the grid
   */
  public insert(entity: T): void {
    if (!entity.active) return;

    const key = this.getCellKey(entity.x, entity.y);
    const cell = this.grid.get(key);

    if (cell) {
      cell.push(entity);
    } else {
      this.grid.set(key, [entity]);
    }
  }

  /**
   * Insert multiple entities into the grid
   */
  public insertAll(entities: T[]): void {
    for (const entity of entities) {
      this.insert(entity);
    }
  }

  /**
   * Get all entities in the same cell and neighboring cells
   */
  public getNearby(x: number, y: number): T[] {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    const nearby: T[] = [];

    // Check 3x3 grid of cells (current + 8 neighbors)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cellX + dx},${cellY + dy}`;
        const cell = this.grid.get(key);
        if (cell) {
          nearby.push(...cell);
        }
      }
    }

    return nearby;
  }
}

// Singleton instances with proper types
export const bulletGrid = new SpatialGrid<Bullet>(150);
export const enemyGrid = new SpatialGrid<Enemy>(150);
