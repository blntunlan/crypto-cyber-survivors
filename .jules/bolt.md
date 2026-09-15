## 2024-05-24 - Zero-allocation loops in CombatSystem
**Learning:** Found `.forEachInRange` callbacks being used in `CombatSystem.ts` (lines 158, 184) which allocate a closure in the high-frequency tick path. The `SpatialGrid` already provides a `forEachInRangeWithContext` variant which is designed to avoid exactly this by passing a context object instead of allocating closures.
**Action:** Use `forEachInRangeWithContext` with a pre-allocated static context object for grid searches in performance-critical areas instead of `forEachInRange` to avoid GC pressure.
