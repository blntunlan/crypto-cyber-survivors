## 2026-02-17 - SpatialGrid Arithmetic Optimization
**Learning:** `SpatialGrid` coordinate calculations were using division (`x / cellSize`) which is slower than multiplication. Caching `invCellSize = 1 / cellSize` provides a small but critical speedup in hot collision loops.
**Action:** Always verify if divisions in hot loops can be replaced by multiplication with cached inverse.

**Learning:** Bitwise operations like `(cellX + dx) << 16` inside nested loops were redundant. Hoisting them out of the inner loop reduced arithmetic operations significantly.
**Action:** Apply Loop Invariant Code Motion aggressively in nested loops within render/update cycles.
