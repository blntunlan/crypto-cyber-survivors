## 2026-04-12 - Object Pooling Edge Cases
**Learning:** When manually iterating over object pools (e.g., `pool.activeEnemies`) with standard `for` loops, always include a guard clause (e.g., `if (entity === undefined) continue;`) to prevent runtime TypeErrors from sparse arrays or concurrently modified pools.
**Action:** Always use a guard clause inside standard `for` loops that iterate over pooled entity arrays.
