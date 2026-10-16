
## 2024-05-18 - Eliminating Closure Allocations in Hot Spatial Grid Queries
**Learning:** Passing dynamic inline callbacks to iterator functions like `forEachInRange` inside highly-frequent hot paths (such as `findNearestEnemy` evaluated per player shot/frame) causes excessive garbage collection pressure due to constant closure allocations and context variable captures.
**Action:** Extract state variables into a flattened, static context object (e.g., `TARGETING_CONTEXT`) and use context-aware iterators like `forEachInRangeWithContext` alongside static processing functions to completely eliminate dynamic closures and secondary object allocations during iteration.
