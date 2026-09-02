## 2026-09-02 - Zero-Allocation Iteration Pattern
**Learning:** In high-frequency physics update loops (like `MovementSystem.ts`), using `Array.prototype.forEach` creates a new closure allocation per frame per entity type, causing measurable garbage collection pressure and stuttering in the engine.
**Action:** Always replace `.forEach` with standard `for` loops in physics and renderer tick functions, ensuring to substitute `return` with `continue` inside the loops.
