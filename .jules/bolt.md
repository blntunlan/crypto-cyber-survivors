## 2024-09-04 - [Optimization] Zero-Allocation Context in Spatial Queries
**Learning:** Passing inline closure functions to spatial grid queries (like `forEachInRange`) in high-frequency update loops (e.g., 60 FPS combat auto-aiming) causes continuous garbage collection overhead due to closure allocations per frame.
**Action:** Use context-aware variants (e.g., `forEachInRangeWithContext`) and pass a pre-allocated static context object along with a static module-level callback function to eliminate dynamic function and object allocations during these hot paths.
