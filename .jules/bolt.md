## 2025-02-25 - Avoid Closure Allocation in Hot Paths
**Learning:** High-frequency game loops (e.g. MovementSystem updating arrays at 60 FPS) suffer unnecessary garbage collection overhead when using `Array.prototype.forEach` due to continuous closure function allocation.
**Action:** Replace `forEach` iteration blocks with standard `for (let i = 0; i < arr.length; i++)` loops to eliminate closure allocations and reduce GC stutter during gameplay.
