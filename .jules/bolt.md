## 2024-05-18 - [Optimization] Converted standard active entity pool `forEach` iterations to `for` loops
**Learning:** High-frequency loop paths (e.g., 60 FPS update loops like `MovementSystem.ts` and `CombatResolutionService.ts`) use `Array.prototype.forEach` extensively which introduces closure allocation overhead and GC pressure.
**Action:** Replaced `forEach` loops over standard arrays (like `pool.activeEnemies`) with standard `for` loops in hot paths to avoid closure allocation.
