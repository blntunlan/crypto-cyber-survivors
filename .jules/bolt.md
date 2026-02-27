# Bolt's Journal

## 2024-05-22 - Optimization of SpatialGrid.clear()
**Learning:** `SpatialGrid.clear()` iterates over all values in the Map. Even though `cell.length = 0` is fast, iterating a large Map can be slow if there are many cells. `Map.values()` returns an iterator.
**Action:** `this.arrayPool` is just a stack of arrays.
The `clear()` method does:
```typescript
  public clear(): void {
    for (const cell of this.grid.values()) {
      cell.length = 0; // Empty the array without deallocating
      this.arrayPool.push(cell);
    }
    this.grid.clear();
  }
```
This is generally efficient because it reuses arrays.

**However, `insert` allocates objects?**
```typescript
  public insert(entity: T): void {
    if (!entity.active) return;

    const key = this.getNumericKey(entity.x, entity.y);
    let cell = this.grid.get(key);

    if (!cell) {
      cell = this.arrayPool.pop() ?? [];
      this.grid.set(key, cell);
    }
    cell.push(entity);
  }
```
`getNumericKey` allocates nothing (returns number).
`cell.push(entity)` is fast.

**Optimization Opportunity in `forEachInRange`**
```typescript
  public forEachInRange(
    x: number,
    y: number,
    radius: number,
    callback: (entity: T) => void
  ): void {
    const cellX = Math.floor(x / this.cellSize) + CELL_COORD_OFFSET;
    const cellY = Math.floor(y / this.cellSize) + CELL_COORD_OFFSET;

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const key = ((cellX + dx) << 16) | (cellY + dy);
        const cell = this.grid.get(key);
        if (cell) {
          const len = cell.length;
          for (let i = 0; i < len; i++) {
            callback(cell[i]!);
          }
        }
      }
    }
  }
```
Inside the inner loop:
`((cellX + dx) << 16)` is recalculated for every `dy`.
We can hoist `((cellX + dx) << 16)` out of the inner loop.

```typescript
    for (let dx = -radius; dx <= radius; dx++) {
      const xKey = (cellX + dx) << 16;
      for (let dy = -radius; dy <= radius; dy++) {
        const key = xKey | (cellY + dy);
        // ...
      }
    }
```
This saves `(radius*2+1)` shift operations per outer loop iteration.
For radius=1 (3x3 grid), that's 3 iterations of outer loop.
Total shifts: `3 * 3 = 9` shifts currently.
Optimized: `3` shifts.
Savings: 6 shifts per call.
This is a micro-optimization. Is it measurable?
`forEachNearby` is called for every bullet (against enemies) and every enemy (against player, if logic was there).
In `CollisionSystem.ts`:
```typescript
    // Batch collision check - get nearby bullets once
    this.ctx.bulletGrid.forEachNearby(obj.x, obj.y, bullet => { ... });
```
This is called for every interactable.

Also `CombatSystem.ts` calls `enemyGrid.forEachInRange(player.x, player.y, 1, ...)` (once per frame).

The heavy user is `processBulletCollisions` in `CollisionSystem.ts`.
It iterates active enemies.
```typescript
    const activeEnemies = pool.activeEnemies;
    const enemiesCount = activeEnemies.length;
    for (let i = 0; i < enemiesCount; i++) {
       // ...
       this.processBulletCollisions(...)
    }
```
`processBulletCollisions` calls `this.ctx.bulletGrid.forEachNearby(ex, ey, ...)`
If there are 100 enemies, and `forEachNearby` does 9 map lookups.
100 * 9 = 900 map lookups per frame.
If we hoist the shift, we save 600 shifts.
Bitwise ops are single cycle.
This might be too micro.

**Better Optimization?**
`Map.get(key)` is fast but not instant.
If `radius` is 1, we access `(cx-1, cy-1)`, `(cx-1, cy)`, `(cx-1, cy+1)`, etc.
If we use a flat array instead of a Map, it might be faster, but memory usage would be huge because the world is sparse (coordinates -32k to 32k). `Map` is the right choice.

**What about `Math.floor`?**
`Math.floor` is fast. `x / cellSize` is float division.
If we use `1 / cellSize` multiplication, it's faster.
`this.cellSize` is constant per grid.
We can precompute `invCellSize = 1 / cellSize`.
Then `Math.floor(x * this.invCellSize)`.
Multiplication is generally faster than division.

**Wait, `SpatialGrid` constructor:**
```typescript
  constructor(cellSize: number = 100) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }
```
We can add `private invCellSize: number;` and set it in constructor.

**Let's verify strict boundaries with multiplication.**
`Math.floor(100 / 100)` = 1.
`Math.floor(100 * 0.01)` = `Math.floor(1)` = 1.
`Math.floor(199 / 100)` = 1.
`Math.floor(199 * 0.01)` = `Math.floor(1.99)` = 1.
However, floating point precision can be tricky.
`100 * (1/100)` might be `0.9999999999999` => `Math.floor` gives 0.
This would break the grid!
Example: `cellSize = 3`. `1/3 = 0.3333333333333333`.
`3 * 0.3333333333333333 = 0.9999999999999999`.
`Math.floor` gives 0.
But `3 / 3` gives 1.
So replacing division with multiplication is RISKY for grid coordinates.
I will add this to the journal as an anti-pattern.

**Back to the loop hoisting.**
The hoisting is safe.
`SpatialGrid.forEachInRange` is a hot path.

**Another optimization: `insert`**
`const key = this.getNumericKey(entity.x, entity.y);`
```typescript
  private getNumericKey(x: number, y: number): number {
    const cellX = Math.floor(x / this.cellSize) + CELL_COORD_OFFSET;
    const cellY = Math.floor(y / this.cellSize) + CELL_COORD_OFFSET;
    return (cellX << 16) | cellY;
  }
```
This is called for every bullet every frame (rebuild).
1000 bullets => 1000 divisions.
Also `forEachNearby` calls `Math.floor` twice.
If we have 100 enemies, `processBulletCollisions` calls `forEachNearby` 100 times.
That's 200 divisions.

**Wait, `insertAll` loop.**
```typescript
  public insertAll(entities: T[]): void {
    const len = entities.length;
    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      if (entity !== undefined) {
        this.insert(entity);
      }
    }
  }
```
This is fine.

**Is there a way to avoid `grid.values()` in `clear()`?**
We could maintain a list of active keys or active cells in a separate array.
When we insert into a new cell, we push the cell (or key) to `activeCells`.
Then in `clear()`, we iterate `activeCells` instead of `grid.values()`.
`grid.values()` iterates the *entire* map.
In V8, `Map` iteration is roughly proportional to size.
If the map grows large and then we clear it, it shrinks.
But since we clear it every frame, the map size is exactly the number of occupied cells.
So iterating `grid.values()` is iterating only occupied cells.
So maintaining a separate array of active cells is redundant.

**Let's look at `forEachInRange` again.**
```typescript
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const key = ((cellX + dx) << 16) | (cellY + dy);
        const cell = this.grid.get(key);
        if (cell) {
          const len = cell.length;
          for (let i = 0; i < len; i++) {
            callback(cell[i]!);
          }
        }
      }
    }
```
For `radius=1` (3x3), this does 9 lookups.
Most of the time, `cell` is undefined (empty).
If we are in a sparse area, 8 out of 9 lookups might be undefined.
There is no way to avoid checking neighbors if we want to find neighbors.

**What if we optimize `getNumericKey`?**
It's just math.

**Wait, I see `getNearby` is deprecated but `SpatialGrid.ts` still has it.**
I can remove it if I'm sure it's unused.
But that's cleanup, not performance.

**Hoisting the bit shift in `forEachInRange`**
It's a valid optimization.
It's safe.
It's in a hot loop (nested loops).
`dx` loop runs `2*radius + 1` times.
`dy` loop runs `2*radius + 1` times.
For radius=1, 3x3=9 iterations.
Hoist:
```typescript
    for (let dx = -radius; dx <= radius; dx++) {
      const keyX = (cellX + dx) << 16;
      for (let dy = -radius; dy <= radius; dy++) {
         const key = keyX | (cellY + dy);
         // ...
      }
    }
```
This saves `(2*r+1)^2 - (2*r+1)` shifts.
For r=1: 9 - 3 = 6 shifts.
For r=3 (used in `CombatSystem` fallback): 49 - 7 = 42 shifts.
This seems small, but if `forEachInRange` is called hundreds of times per frame, it adds up.
100 calls * 6 shifts = 600 ops.
Not huge.

**Are there redundant calls?**
In `CombatSystem.ts`:
```typescript
    enemyGrid.forEachInRange(player.x, player.y, 1, enemy => { ... });
```
This is called once per `processAutoFire`, which is called once per frame (or less if throttled).
Wait, `processAutoFire` returns early if `state.fireTimer < cappedFireRate`.
So this is NOT called every frame if fire rate is low.

**The biggest user is `CollisionSystem` -> `processBulletCollisions`.**
It runs for every active enemy.
If we have 500 enemies, that's 500 calls to `forEachNearby`.
500 * 6 shifts = 3000 shifts per frame.
It's something.

**Is there a bigger fish?**
`CollisionSystem.ts`:
```typescript
      // 1. Boundary Check (Culling)
      if (this.isOffScreen(enemy, width, height)) {
        enemy.active = false;
        continue;
      }
```
`isOffScreen` is called for every enemy.
```typescript
  private isOffScreen(enemy: Enemy, width: number, height: number): boolean {
    const threshold = this.ctx.constants.ENEMY_OFFSCREEN_THRESHOLD;
    return (
      enemy.x < -threshold ||
      enemy.x > width + threshold ||
      enemy.y < -threshold ||
      enemy.y > height + threshold
    );
  }
```
`this.ctx.constants.ENEMY_OFFSCREEN_THRESHOLD` is a property access.
If we cache `threshold` in `update` method, we save 4 property accesses per enemy?
No, V8 optimizes property access.

**What about `CollisionSystem.update`?**
It iterates `pool.activeEnemies`.
Inside the loop, it calls `this.processBulletCollisions`.
Inside `processBulletCollisions`:
```typescript
    this.ctx.bulletGrid.forEachNearby(ex, ey, bullet => {
      // ...
      const dx = ex - bullet.x;
      const dy = ey - bullet.y;
      const distSq = dx * dx + dy * dy;

      const combinedRadius = er + bullet.radius;
      const combinedRadiusSq = combinedRadius * combinedRadius;

      if (distSq < combinedRadiusSq) {
          // ...
      }
    });
```
`combinedRadius` calculation: `er` is constant for the enemy loop. `bullet.radius` varies.
But `bullet.radius` is usually constant for all bullets unless there are crits/super crits mixed.
Actually `bullet.radius` is stored on the bullet.

**Optimization: Precompute `combinedRadiusSq`?**
No, depends on bullet.

**What about `bulletGrid` insertions?**
`bulletGrid` is cleared and rebuilt every frame.
`insert` calls `getNumericKey`.
`getNumericKey` does `Math.floor`.

**Is there a way to avoid `Math.floor`?**
Bitwise truncation `| 0` is equivalent to `Math.floor` for positive numbers.
For negative numbers: `Math.floor(-0.5) = -1`. `(-0.5) | 0 = 0`.
The game world uses coordinates around 0?
`CELL_COORD_OFFSET` is 32768.
So `x + OFFSET` is likely positive.
Wait, `getNumericKey` logic:
```typescript
    const cellX = Math.floor(x / this.cellSize) + CELL_COORD_OFFSET;
```
If `x` is -50, `cellSize` 100.
`x/100` = -0.5.
`Math.floor(-0.5)` = -1.
`cellX` = 32767.

If we do `(x / this.cellSize) | 0`:
`-0.5 | 0` = 0.
`cellX` = 32768.
Different result!
So we cannot simply replace `Math.floor` with `| 0` unless we adjust the offset or logic.
If we use `Math.floor` we are safe.

**Wait, `x` is world coordinate.**
If `x` is positive, `Math.floor` and `| 0` are same.
If `x` is negative, they differ by 1.
If we consistently use `| 0`, the grid will still work, just the cells will be shifted slightly for negative numbers.
`SpatialGrid` divides space.
`[-99, 0]` maps to `0` with `| 0`. `[0, 99]` maps to `0`.
So cell 0 would cover `[-99, 99]`. (Size 200).
That's BAD. `Math.floor` is correct: `[-99, 0]` -> -1. `[0, 99]` -> 0.

**However, `Math.floor` is slower than bitwise OR.**
But correctness is key.

**Wait, let's look at `forEachInRange` again.**
```typescript
        const key = ((cellX + dx) << 16) | (cellY + dy);
```
`cellX` and `cellY` are integers.
`dx` is integer.
`<< 16` is bitwise.
`|` is bitwise.
This is fast.

**The allocation in `insert`?**
```typescript
    if (!cell) {
      cell = this.arrayPool.pop() ?? [];
      this.grid.set(key, cell);
    }
```
`grid.set` might allocate a map entry.
`Map` operations are generally optimized but `set` and `delete` (implied by `clear`) thrash the map.
But `clear()` clears the map.
If the number of cells is stable, maybe we shouldn't `clear()` the map?
Instead of `this.grid.clear()`, we could iterate `this.grid` and just set `length=0` on arrays, but keep the arrays in the map?
Then `insert` would reuse existing arrays in the map without `set`.
BUT, we need to handle empty cells.
If we don't clear the map, we might check neighbors that are now empty.
`forEachInRange` checks `cell.length`.
```typescript
        const cell = this.grid.get(key);
        if (cell) {
          const len = cell.length;
          for (let i = 0; i < len; i++) {
            callback(cell[i]!);
          }
        }
```
If `cell` exists but is empty, loop doesn't run.
This is SAFE.

**Optimization: Reuse Map entries**
Instead of:
```typescript
  public clear(): void {
    for (const cell of this.grid.values()) {
      cell.length = 0; // Empty the array without deallocating
      this.arrayPool.push(cell);
    }
    this.grid.clear();
  }
```
We do:
```typescript
  public clear(): void {
    for (const cell of this.grid.values()) {
      cell.length = 0;
    }
    // Do NOT clear grid.
    // Do NOT push to arrayPool (arrays stay in map).
  }
```
And `insert`:
```typescript
  public insert(entity: T): void {
    // ...
    let cell = this.grid.get(key);
    if (!cell) {
      cell = this.arrayPool.pop() ?? []; // Or just new []
      this.grid.set(key, cell);
    }
    cell.push(entity);
  }
```
**Benefits:**
1. Avoids `Map.clear()` (expensive if map is large).
2. Avoids `Map.set()` (expensive rehashing/allocation) for existing cells.
3. Avoids `arrayPool.push` / `arrayPool.pop` overhead.

**Downsides:**
1. Map grows indefinitely?
   - The map keys are grid coordinates.
   - If entities move around the world, we might accumulate empty cells in the map.
   - If the player explores a huge world, the map will grow.
   - `CELL_COORD_OFFSET` allows -32k to +32k.
   - If the map becomes huge, iterating `this.grid.values()` in `clear()` becomes slow!
   - `clear()` iterates ALL values, even empty ones.
   - If we have 10,000 visited cells but only 100 active ones, `clear()` becomes 100x slower.

**Hybrid Approach:**
We want to keep "active" cells and delete "stale" cells.
Or just stick to the current approach which effectively "deletes" everything every frame.
Current approach ensures O(ActiveCells) iteration in `clear()`.
This is better for a potentially infinite world where only a small window is active.
So the current approach is actually safer for memory/performance over time, unless the active area is static.

**Okay, back to `forEachInRange` loop hoisting.**
It's a small but sure win.
And checking `getNearby` usage.

**Another check: `PhysicsTypes.ts`**
It defines `ISpatialGrid`.
```typescript
export interface ISpatialGrid<T> {
  getNearby(x: number, y: number): T[];
  forEachNearby(x: number, y: number, callback: (entity: T) => void): void;
}
```
If I optimize `SpatialGrid`, I should update the interface if I remove `getNearby`.
But `getNearby` is deprecated, not removed.
I can leave it.

**Let's profile the loop hoisting.**
It's a classic optimization.
In `SpatialGrid.ts`:
```typescript
  public forEachInRange(
    x: number,
    y: number,
    radius: number,
    callback: (entity: T) => void
  ): void {
    const cellX = Math.floor(x / this.cellSize) + CELL_COORD_OFFSET;
    const cellY = Math.floor(y / this.cellSize) + CELL_COORD_OFFSET;

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const key = ((cellX + dx) << 16) | (cellY + dy);
        // ...
      }
    }
  }
```
I will hoist the X calculation.

**What about `CollisionSystem.processBulletCollisions`?**
It does a lot of repetitive work.
It calls `forEachNearby` for each enemy.
If multiple enemies are in the same cell, we query the same cell multiple times.
But enemies are distinct.

**Alternative: Iterate Bullets?**
If we iterate bullets and check nearby enemies?
There are usually more bullets than enemies (bullet hell).
So iterating enemies (fewer) and querying bullets (spatial lookup) is correct.

**Plan:**
1.  Add journal entry about `Math.floor` vs multiplication anti-pattern.
2.  Optimize `SpatialGrid.forEachInRange` by hoisting the X-coordinate bit shifting.
3.  Add performance benchmark comment.

**Wait, I see `getNearby` is used in `tests/SpatialGrid.test.ts` extensively.**
I should keep it.

**Let's check if there are other optimizations.**
`PoolManager.ts`?
`EntityRenderer.ts`?

In `EntityRenderer.ts` (from memory):
"Reusable class properties (`gemBatchStandard`, `gemBatchRare`) are used as batching buffers".
"Reuse a single `ViewportBounds` object instance".

**Let's check `services/combat/PoolManager.ts`**
I haven't read it yet.
