## 2024-05-15 - MovementSystem Hot Path Loop Optimization
**Learning:** In high-frequency physics update loops (like `MovementSystem.update`), `Array.prototype.forEach` creates closure function allocations every frame, leading to GC pressure and potential frame drops.
**Action:** Replace `forEach` with standard `for` loops in hot paths, ensuring array sparseness safety with `if (item === undefined) continue;`.
