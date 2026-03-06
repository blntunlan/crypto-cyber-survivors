## 2024-05-14 - Optimize High-Frequency Loop Paths
**Learning:** In high-frequency loop paths (e.g., 60 FPS update loops in `MovementSystem.ts` and `CollectionSystem.ts`), replace `Array.prototype.forEach` with standard `for (let i = 0, len = arr.length; i < len; i++)` loops. This avoids creating closure function allocations per iteration, significantly reducing Garbage Collection (GC) pressure and overhead. Specialized zero-allocation iterators like `SpatialGrid.forEachNearby` are exceptions.
**Action:** Replace `forEach` with standard `for` loops in hot paths where possible.
