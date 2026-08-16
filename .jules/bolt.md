## 2024-05-18 - Replacing forEach with for-loops in 60 FPS update paths
**Learning:** Closure allocations within `Array.prototype.forEach` create significant garbage collection pressure when executed repeatedly in 60 FPS update loops (like in `MovementSystem.ts`).
**Action:** Replace `.forEach` with standard `for` loops in high-frequency update paths, ensuring `undefined` checks are added to prevent TypeErrors from sparse object pools. Place explanatory comments inline.
