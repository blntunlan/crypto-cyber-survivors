## 2024-05-22 - SpatialGrid Bitwise Optimization
**Learning:** Hoisting bitwise shift operations (`x << 16`) out of inner loops in spatial hashing significantly reduces redundant calculations. Pre-calculating `1 / cellSize` to replace division with multiplication yields a small but measurable (~4%) performance improvement in hot paths.
**Action:** When implementing grid-based spatial lookups, always hoist invariant bitwise operations and prefer multiplication over division for coordinate mapping.
