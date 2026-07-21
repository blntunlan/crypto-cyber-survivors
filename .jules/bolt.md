
## 2024-05-24 - SpatialGrid Iteration Optimization
**Learning:** Hoisting invariant bitwise operations (like calculating the X-coordinate component of a cell key) out of inner loops in spatial grid queries significantly reduces redundant operations per frame. Additionally, a pure array-clearing strategy (`length = 0`) can lead to unbounded Map growth if cells are transient; a hybrid approach that deletes Map keys for empty cells while reusing their arrays balances GC pressure with memory overhead.
**Action:** When implementing spatial grids or hash maps for transient objects, use hybrid clearing strategies (reclaim arrays but delete empty keys) and always hoist invariant calculations out of inner loops.
