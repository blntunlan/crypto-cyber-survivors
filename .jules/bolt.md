## 2024-10-18 - Replacing `forEach` with standard `for` loop in hot loops
**Learning:** Replaced Array.prototype.forEach with standard `for` loop in hot paths eliminates closure allocations, which is critical for physics/game loops running 60fps to avoid GC stutters.
**Action:** When working on physics, rendering, or game loop tick methods, prioritize using standard `for` loops (caching length) instead of `forEach` on arrays like `pool.activeEnemies`, `pool.activeParticles`, etc.
