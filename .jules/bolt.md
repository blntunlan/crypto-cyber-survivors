## 2026-07-12 - Replaced forEach with for loops in game hot path
**Learning:** In high-frequency game loop paths (like `MovementSystem.ts`), `Array.prototype.forEach` creates unnecessary closure function allocations resulting in GC pressure and frame drops.
**Action:** Always replace `forEach` with standard `for (let i = 0, len = arr.length; i < len; i++)` loops in 60 FPS update paths, taking care to handle sparsely populated pool arrays with `if (element === undefined) continue` and replacing `return` with `continue`.
