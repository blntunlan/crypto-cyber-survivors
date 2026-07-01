## 2025-07-01 - Zero-allocation Loops for Spatial Queries
**Learning:** High-frequency rendering and physics systems (like `CombatSystem.ts` and `EntityRenderer.ts`) suffer from GC pressure and iteration overhead when using `Array.prototype.forEach`.
**Action:** Replace `forEach` with standard `for` loops in critical paths to avoid closure allocations, while preserving safety with proper undefined guard checks.
