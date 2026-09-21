## 2023-10-27 - Zero-allocation spatial queries in Combat Loop
**Learning:** In heavily used loops like combat targeting (`CombatSystem`, `WeaponFiringPipeline`), passing an inline callback to `forEachInRange` allocates a closure on every execution, causing high garbage collection pressure.
**Action:** Use context-aware iterations (`forEachInRangeWithContext`) coupled with a statically pre-allocated context object (`TARGETING_CONTEXT`) and a static standalone callback function to query spatial grids without allocating any memory dynamically.
