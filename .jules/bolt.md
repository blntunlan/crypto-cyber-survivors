## 2025-02-27 - Zero-Allocation Iteration Optimization
**Learning:** High-frequency paths (like `MovementSystem.ts` and `EntityRenderer.ts` hot loops at 60 FPS) exhibit significant GC pressure and overhead when utilizing `Array.prototype.forEach`. However, manual loop unrolling can cause de-optimization in V8.
**Action:** Replace `forEach` with standard `for (let i = 0, len = arr.length; i < len; i++)` loops, ensuring guard clauses (`if (entity === undefined) continue;`) are added for sparse arrays to prevent TypeErrors, rather than manual unrolling or relying on higher-order array methods.
