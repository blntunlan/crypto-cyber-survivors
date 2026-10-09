## 2024-10-09 - SpatialGrid Closure Allocations
**Learning:** `forEachInRange` on `SpatialGrid` instances generates significant closure allocations every frame when inline callbacks are used (like inside `CombatSystem` and `WeaponFiringPipeline`).
**Action:** Always prefer `forEachInRangeWithContext` alongside a static, pre-allocated context object (e.g. `TARGETING_CONTEXT`) for high-frequency queries to completely eliminate closure allocations per update.
