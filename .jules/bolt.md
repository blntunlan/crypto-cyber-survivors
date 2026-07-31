## 2026-07-31 - Zero-Allocation Loop Translation
**Learning:** In high-frequency loop paths like `MovementSystem.ts` and `EntityRenderer.ts` (60 FPS context), converting `Array.prototype.forEach` to standard `for` loops prevents GC pressure from closure allocations. When refactoring, ensuring `return` statements are correctly translated to `continue` is critical for preserving control flow.
**Action:** Proactively use standard `for` loops for object pools over `forEach` in hot render/physics loops.
