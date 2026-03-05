## 2024-03-05 - Avoid forEach in Hot Loops
**Learning:** `Array.prototype.forEach` allocates a function for every iteration and executes a callback, creating overhead and GC pressure in high-frequency update loops (e.g. 60 FPS update loops in `MovementSystem.ts`).
**Action:** Use standard `for (let i = 0, len = arr.length; i < len; i++)` loops instead for arrays iterated over in hot paths to avoid closure allocations and maximize performance, unless using specialized iterators like `SpatialGrid.forEachNearby` which are specifically designed for zero-allocation performance.
