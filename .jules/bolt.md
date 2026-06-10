## 2024-06-10 - Replace Array.prototype.forEach with standard for-loops in hot paths
**Learning:** Using `Array.prototype.forEach` inside 60 FPS hot paths like `MovementSystem.ts` generates closure allocations every frame, increasing GC pressure and causing micro-stutters.
**Action:** Always use standard `for` loops (`for (let i = 0, len = arr.length; i < len; i++)`) in high-frequency update loops. Ensure proper guard clauses (`if (entity === undefined) continue;`) are added when iterating over object pools.
