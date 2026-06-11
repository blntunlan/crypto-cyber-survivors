## 2024-05-30 - Replace forEach with for-loops in hot paths
**Learning:** `Array.prototype.forEach` creates closure function allocations that cause high GC pressure in the 60fps physics hot loops (e.g. `MovementSystem.ts`).
**Action:** Replace `forEach` with zero-allocation `for (let i = 0, len = arr.length; i < len; i++)` loops in these critical systems.
