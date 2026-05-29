## 2024-05-18 - Replacing forEach in Hot Loops
**Learning:** Replaced Array.prototype.forEach with standard `for` loops in hot code paths like `MovementSystem.ts` to reduce GC pressure and function closure allocations.
**Action:** When working on physics or update loops that run every frame on multiple entities, default to standard `for` loops rather than high-order array methods.
