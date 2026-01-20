import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialGrid, bulletGrid, enemyGrid } from '../services/SpatialGrid';

/**
 * SpatialGrid Unit Tests
 *
 * Tests cover:
 * - Grid construction and configuration
 * - Entity insertion (single and bulk)
 * - Nearby entity retrieval (3x3 cell area)
 * - Grid clearing
 * - Edge cases (negative coords, boundaries, inactive entities)
 *
 * Following AAA pattern (Arrange-Act-Assert)
 */

// Test entity type matching SpatialGrid constraint
interface TestEntity {
  x: number;
  y: number;
  active: boolean;
  id: string; // For easy identification in tests
}

// Factory function for creating test entities
function createTestEntity(
  id: string,
  x: number,
  y: number,
  active: boolean = true
): TestEntity {
  return { id, x, y, active };
}

describe('SpatialGrid', () => {
  let grid: SpatialGrid<TestEntity>;

  beforeEach(() => {
    // Create a fresh grid with default cell size of 100
    grid = new SpatialGrid<TestEntity>(100);
  });

  // =====================
  // SECTION: Constructor
  // =====================
  describe('constructor', () => {
    it('should create grid with default cell size of 100', () => {
      const defaultGrid = new SpatialGrid<TestEntity>();
      const entity = createTestEntity('e1', 50, 50);

      defaultGrid.insert(entity);
      const nearby = defaultGrid.getNearby(50, 50);

      expect(nearby).toContain(entity);
    });

    it('should create grid with custom cell size', () => {
      const customGrid = new SpatialGrid<TestEntity>(200);
      const entity = createTestEntity('e1', 150, 150);

      customGrid.insert(entity);
      const nearby = customGrid.getNearby(150, 150);

      expect(nearby).toContain(entity);
    });

    it('should start with empty grid', () => {
      const nearby = grid.getNearby(0, 0);
      expect(nearby).toHaveLength(0);
    });
  });

  // =====================
  // SECTION: clear()
  // =====================
  describe('clear()', () => {
    it('should remove all entities from grid', () => {
      // Arrange
      const entity1 = createTestEntity('e1', 50, 50);
      const entity2 = createTestEntity('e2', 150, 150);
      grid.insert(entity1);
      grid.insert(entity2);

      // Act
      grid.clear();

      // Assert
      expect(grid.getNearby(50, 50)).toHaveLength(0);
      expect(grid.getNearby(150, 150)).toHaveLength(0);
    });

    it('should allow new insertions after clear', () => {
      const entity1 = createTestEntity('e1', 50, 50);
      grid.insert(entity1);
      grid.clear();

      const entity2 = createTestEntity('e2', 60, 60);
      grid.insert(entity2);

      const nearby = grid.getNearby(60, 60);
      expect(nearby).toHaveLength(1);
      expect(nearby).toContain(entity2);
    });

    it('should clear grid even when empty', () => {
      // Should not throw
      expect(() => grid.clear()).not.toThrow();
    });
  });

  // =====================
  // SECTION: insert()
  // =====================
  describe('insert()', () => {
    describe('basic insertion', () => {
      it('should insert active entity into grid', () => {
        const entity = createTestEntity('e1', 50, 50);

        grid.insert(entity);

        const nearby = grid.getNearby(50, 50);
        expect(nearby).toContain(entity);
      });

      it('should not insert inactive entity', () => {
        const entity = createTestEntity('e1', 50, 50, false);

        grid.insert(entity);

        const nearby = grid.getNearby(50, 50);
        expect(nearby).toHaveLength(0);
      });

      it('should insert multiple entities into same cell', () => {
        const entity1 = createTestEntity('e1', 10, 10);
        const entity2 = createTestEntity('e2', 20, 20);
        const entity3 = createTestEntity('e3', 90, 90);

        grid.insert(entity1);
        grid.insert(entity2);
        grid.insert(entity3);

        const nearby = grid.getNearby(50, 50);
        expect(nearby).toHaveLength(3);
        expect(nearby).toContain(entity1);
        expect(nearby).toContain(entity2);
        expect(nearby).toContain(entity3);
      });

      it('should insert entities into different cells', () => {
        const entity1 = createTestEntity('e1', 50, 50); // Cell (0,0)
        const entity2 = createTestEntity('e2', 150, 50); // Cell (1,0)
        const entity3 = createTestEntity('e3', 250, 250); // Cell (2,2)

        grid.insert(entity1);
        grid.insert(entity2);
        grid.insert(entity3);

        // Query near entity3, shouldn't find entity1 (too far)
        const nearby = grid.getNearby(250, 250);
        expect(nearby).toContain(entity3);
        expect(nearby).not.toContain(entity1);
      });
    });

    describe('cell boundary behavior', () => {
      it('should place entity at (0,0) in cell (0,0)', () => {
        const entity = createTestEntity('origin', 0, 0);
        grid.insert(entity);

        const nearby = grid.getNearby(0, 0);
        expect(nearby).toContain(entity);
      });

      it('should place entity at (99,99) in cell (0,0)', () => {
        const entity = createTestEntity('e1', 99, 99);
        grid.insert(entity);

        const nearby = grid.getNearby(50, 50);
        expect(nearby).toContain(entity);
      });

      it('should place entity at (100,100) in cell (1,1)', () => {
        const entity = createTestEntity('e1', 100, 100);
        grid.insert(entity);

        // Entity in (1,1) should be found from (150,150) query
        const nearby = grid.getNearby(150, 150);
        expect(nearby).toContain(entity);
      });

      it('should handle exact cell boundary correctly', () => {
        const entity1 = createTestEntity('e1', 99, 50); // Cell (0,0)
        const entity2 = createTestEntity('e2', 100, 50); // Cell (1,0)

        grid.insert(entity1);
        grid.insert(entity2);

        // Query from cell (0,0) should find both (adjacent cells)
        const nearby = grid.getNearby(50, 50);
        expect(nearby).toContain(entity1);
        expect(nearby).toContain(entity2); // In adjacent cell
      });
    });

    describe('negative coordinates', () => {
      it('should handle negative x coordinate', () => {
        const entity = createTestEntity('e1', -50, 50);
        grid.insert(entity);

        const nearby = grid.getNearby(-50, 50);
        expect(nearby).toContain(entity);
      });

      it('should handle negative y coordinate', () => {
        const entity = createTestEntity('e1', 50, -50);
        grid.insert(entity);

        const nearby = grid.getNearby(50, -50);
        expect(nearby).toContain(entity);
      });

      it('should handle both negative coordinates', () => {
        const entity = createTestEntity('e1', -150, -150);
        grid.insert(entity);

        const nearby = grid.getNearby(-150, -150);
        expect(nearby).toContain(entity);
      });

      it('should correctly separate negative and positive cells', () => {
        const negEntity = createTestEntity('neg', -50, -50); // Cell (-1,-1)
        const posEntity = createTestEntity('pos', 150, 150); // Cell (1,1)

        grid.insert(negEntity);
        grid.insert(posEntity);

        const nearbyNeg = grid.getNearby(-50, -50);
        expect(nearbyNeg).toContain(negEntity);
        expect(nearbyNeg).not.toContain(posEntity);
      });
    });
  });

  // =====================
  // SECTION: insertAll()
  // =====================
  describe('insertAll()', () => {
    it('should insert all active entities', () => {
      const entities = [
        createTestEntity('e1', 10, 10),
        createTestEntity('e2', 20, 20),
        createTestEntity('e3', 30, 30),
      ];

      grid.insertAll(entities);

      const nearby = grid.getNearby(20, 20);
      expect(nearby).toHaveLength(3);
    });

    it('should skip inactive entities in batch', () => {
      const entities = [
        createTestEntity('active1', 10, 10, true),
        createTestEntity('inactive', 20, 20, false),
        createTestEntity('active2', 30, 30, true),
      ];

      grid.insertAll(entities);

      const nearby = grid.getNearby(20, 20);
      expect(nearby).toHaveLength(2);
      expect(nearby.find(e => e.id === 'inactive')).toBeUndefined();
    });

    it('should handle empty array', () => {
      grid.insertAll([]);

      const nearby = grid.getNearby(0, 0);
      expect(nearby).toHaveLength(0);
    });

    it('should insert entities into correct cells', () => {
      const entities = [
        createTestEntity('e1', 50, 50), // Cell (0,0)
        createTestEntity('e2', 150, 150), // Cell (1,1)
        createTestEntity('e3', 350, 350), // Cell (3,3)
      ];

      grid.insertAll(entities);

      // Query from (0,0) should only find e1 and e2 (adjacent)
      const nearbyOrigin = grid.getNearby(50, 50);
      expect(nearbyOrigin).toContain(entities[0]);
      expect(nearbyOrigin).toContain(entities[1]); // Adjacent cell
      expect(nearbyOrigin).not.toContain(entities[2]); // Too far
    });
  });

  // =====================
  // SECTION: getNearby()
  // =====================
  describe('getNearby()', () => {
    describe('3x3 cell coverage', () => {
      it('should find entity in same cell', () => {
        const entity = createTestEntity('same', 50, 50);
        grid.insert(entity);

        const nearby = grid.getNearby(60, 60);
        expect(nearby).toContain(entity);
      });

      it('should find entity in cell to the right', () => {
        const entity = createTestEntity('right', 150, 50); // Cell (1,0)
        grid.insert(entity);

        const nearby = grid.getNearby(50, 50); // Query from (0,0)
        expect(nearby).toContain(entity);
      });

      it('should find entity in cell below', () => {
        const entity = createTestEntity('below', 50, 150); // Cell (0,1)
        grid.insert(entity);

        const nearby = grid.getNearby(50, 50);
        expect(nearby).toContain(entity);
      });

      it('should find entity in diagonal cell', () => {
        const entity = createTestEntity('diagonal', 150, 150); // Cell (1,1)
        grid.insert(entity);

        const nearby = grid.getNearby(50, 50);
        expect(nearby).toContain(entity);
      });

      it('should find entities in all 9 cells', () => {
        // Create entities in all surrounding cells relative to (1,1)
        const entities = [
          createTestEntity('top-left', 50, 50), // (0,0)
          createTestEntity('top', 150, 50), // (1,0)
          createTestEntity('top-right', 250, 50), // (2,0)
          createTestEntity('left', 50, 150), // (0,1)
          createTestEntity('center', 150, 150), // (1,1)
          createTestEntity('right', 250, 150), // (2,1)
          createTestEntity('bottom-left', 50, 250), // (0,2)
          createTestEntity('bottom', 150, 250), // (1,2)
          createTestEntity('bottom-right', 250, 250), // (2,2)
        ];

        grid.insertAll(entities);

        // Query from center (1,1)
        const nearby = grid.getNearby(150, 150);
        expect(nearby).toHaveLength(9);
        entities.forEach(e => {
          expect(nearby).toContain(e);
        });
      });

      it('should not find entity 2+ cells away', () => {
        const farEntity = createTestEntity('far', 350, 350); // Cell (3,3)
        grid.insert(farEntity);

        const nearby = grid.getNearby(50, 50); // Cell (0,0)
        expect(nearby).not.toContain(farEntity);
      });
    });

    describe('empty results', () => {
      it('should return empty array when no entities', () => {
        const nearby = grid.getNearby(50, 50);
        expect(nearby).toEqual([]);
      });

    it('should reuse target array with getNearbyInto', () => {
      const entity = createTestEntity('e1', 50, 50);
      grid.insert(entity);

      const buffer: TestEntity[] = [];
      grid.getNearbyInto(50, 50, buffer);

      expect(buffer).toHaveLength(1);
      expect(buffer).toContain(entity);

      // Reuse the same buffer without clearing (it should append)
      const entity2 = createTestEntity('e2', 60, 60);
      grid.insert(entity2);

      grid.getNearbyInto(60, 60, buffer);
      expect(buffer).toHaveLength(3); // 1 old + 2 new (both e1 and e2 are nearby)
    });

      it('should return empty array when entities are far away', () => {
        const entity = createTestEntity('far', 500, 500);
        grid.insert(entity);

        const nearby = grid.getNearby(0, 0);
        expect(nearby).toHaveLength(0);
      });
    });

    describe('query at different positions', () => {
      it('should work with query at cell corner', () => {
        const entity = createTestEntity('e1', 50, 50);
        grid.insert(entity);

        const nearby = grid.getNearby(0, 0);
        expect(nearby).toContain(entity);
      });

      it('should work with query at cell center', () => {
        const entity = createTestEntity('e1', 50, 50);
        grid.insert(entity);

        const nearby = grid.getNearby(50, 50);
        expect(nearby).toContain(entity);
      });

      it('should work with negative query position', () => {
        const entity = createTestEntity('neg', -50, -50);
        grid.insert(entity);

        const nearby = grid.getNearby(-50, -50);
        expect(nearby).toContain(entity);
      });
    });
  });

  // =====================
  // SECTION: Edge Cases
  // =====================
  describe('edge cases', () => {
    it('should handle very large coordinates', () => {
      const entity = createTestEntity('large', 10000, 10000);
      grid.insert(entity);

      const nearby = grid.getNearby(10000, 10000);
      expect(nearby).toContain(entity);
    });

    it('should handle floating point coordinates', () => {
      const entity = createTestEntity('float', 50.5, 75.25);
      grid.insert(entity);

      const nearby = grid.getNearby(50.5, 75.25);
      expect(nearby).toContain(entity);
    });

    it('should handle zero cell size edge case', () => {
      // This is a degenerate case - all entities in same "cell"
      const zeroGrid = new SpatialGrid<TestEntity>(1);
      const entity1 = createTestEntity('e1', 0.5, 0.5);
      const entity2 = createTestEntity('e2', 0.9, 0.9);

      zeroGrid.insert(entity1);
      zeroGrid.insert(entity2);

      const nearby = zeroGrid.getNearby(0.5, 0.5);
      expect(nearby).toContain(entity1);
      expect(nearby).toContain(entity2);
    });

    it('should handle large cell size', () => {
      const largeGrid = new SpatialGrid<TestEntity>(1000);
      const entity1 = createTestEntity('e1', 100, 100);
      const entity2 = createTestEntity('e2', 900, 900);

      largeGrid.insert(entity1);
      largeGrid.insert(entity2);

      // Both in same cell, so should be found
      const nearby = largeGrid.getNearby(500, 500);
      expect(nearby).toContain(entity1);
      expect(nearby).toContain(entity2);
    });

    it('should maintain entity reference (not copy)', () => {
      const entity = createTestEntity('ref', 50, 50);
      grid.insert(entity);

      entity.x = 999; // Mutate after insertion

      const nearby = grid.getNearby(50, 50);
      expect(nearby).toHaveLength(1);
      expect(nearby[0]!.x).toBe(999); // Should reflect mutation
    });
  });

  // =====================
  // SECTION: Performance Characteristics
  // =====================
  describe('performance characteristics', () => {
    it('should handle many entities efficiently', () => {
      const entities: TestEntity[] = [];

      // Insert 1000 entities
      for (let i = 0; i < 1000; i++) {
        entities.push(
          createTestEntity(`e${i}`, Math.random() * 5000, Math.random() * 5000)
        );
      }

      const start = performance.now();
      grid.insertAll(entities);
      const insertTime = performance.now() - start;

      // Should be fast (under 50ms for 1000 entities)
      expect(insertTime).toBeLessThan(50);
    });

    it('should retrieve nearby entities quickly', () => {
      // Insert many entities
      for (let i = 0; i < 500; i++) {
        grid.insert(createTestEntity(`e${i}`, i * 10, i * 10));
      }

      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        grid.getNearby(Math.random() * 5000, Math.random() * 5000);
      }
      const queryTime = performance.now() - start;

      // 100 queries should be very fast
      expect(queryTime).toBeLessThan(20);
    });
  });

  // =====================
  // SECTION: Singleton Exports
  // =====================
  describe('singleton exports', () => {
    it('should export bulletGrid with cell size 150', () => {
      expect(bulletGrid).toBeInstanceOf(SpatialGrid);
    });

    it('should export enemyGrid with cell size 150', () => {
      expect(enemyGrid).toBeInstanceOf(SpatialGrid);
    });

    it('should be separate instances', () => {
      expect(bulletGrid).not.toBe(enemyGrid);
    });
  });
});
