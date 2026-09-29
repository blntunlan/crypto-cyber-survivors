## 2024-05-23 - Zero-allocation spatial grid queries
**Learning:** In high-frequency hot paths like `CombatSystem.findNearestEnemy`, iterating over the `SpatialGrid` using `forEachInRange` with inline anonymous callbacks (closures) causes significant frame-level GC pressure due to continuous memory allocation.
**Action:** Always use the context-aware variant `forEachInRangeWithContext` alongside a pre-allocated static context object (e.g., `TARGETING_CONTEXT`) and a static callback function to eliminate dynamic allocations in loop iterations.
