## 2024-05-24 - Zero-Allocation Spatial Queries in CombatSystem
**Learning:** Using inline closures inside high-frequency spatial queries (like `findNearestEnemy`) allocates new functions every frame, causing garbage collection pressure and frame drops.
**Action:** Use context-aware spatial grid iterators (e.g., `forEachInRangeWithContext`) alongside a pre-allocated static context object and evaluation function to eliminate closure allocations and reduce GC pressure.
