## 2024-06-29 - Eliminate Targeting Closure Allocations
**Learning:** Using inline closures inside hot-loop iterators (like `SpatialGrid.forEachInRange`) forces unnecessary frame-level allocations and JS engine deoptimizations, causing GC spikes during high-frequency auto-aim checks in `CombatSystem` and `WeaponFiringPipeline`.
**Action:** Replace inline closures with context-aware grid iterators (`forEachInRangeWithContext`) and use a static, module-level context object to track state instead of allocating a `bestCandidate` object each frame.
