## 2024-05-20 - [Zero-Allocation Optimization]
**Learning:** Closures inside high-frequency loops (like `enemyGrid.forEachInRange`) create excessive garbage collection pressure, leading to frame drops in React/Vite loops.
**Action:** Use context-aware zero-allocation variants (like `forEachInRangeWithContext`) coupled with a shared static context object, eliminating closure allocations entirely on hot paths.
