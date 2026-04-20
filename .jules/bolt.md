## 2025-03-07 - [Reduce GC Overhead via Standard For-Loops]
**Learning:** In high-frequency hot paths like the 60 FPS `update()` loops (e.g., `MovementSystem.ts`, `CollectionSystem.ts`), `Array.prototype.forEach` causes severe garbage collection pressure due to creating closure function allocations per iteration.
**Action:** Always replace `Array.prototype.forEach` with standard `for (let i = 0, len = arr.length; i < len; i++)` loops in system update ticks to prevent GC stalls while ensuring to correctly substitute loop `return` statements for `continue`.
