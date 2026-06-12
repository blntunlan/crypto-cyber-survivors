## 2025-02-12 - Initial Bolt Entry\n**Learning:** Started looking for performance improvements.\n**Action:** Will implement optimizations and record learnings.
## 2025-02-12 - Avoiding forEach in Hot Paths
**Learning:** In high-frequency 60 FPS loops like `MovementSystem.ts` and `EntityRenderer.ts`, using `Array.prototype.forEach` creates closure allocations that add up over time, increasing garbage collection (GC) pressure and causing micro-stutters.
**Action:** When optimizing hot paths in systems running per frame, use zero-allocation standard `for` loops (e.g. `for (let i = 0, len = arr.length; i < len; i++)`) and explicitly guard against sparse arrays with `if (item === undefined) continue;`.
