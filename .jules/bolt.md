## 2025-04-17 - Spatial Query Inner Loops
**Learning:** High-frequency loop paths (e.g., 60 FPS physics loops like `MovementSystem.ts` and `CombatResolutionService.ts`) use `Array.prototype.forEach` to iterate over object pools which causes functional closure allocation per frame.
**Action:** Replace `forEach` with zero-allocation `for` loops and guard sparse arrays with `if (entity === undefined) continue;` to reduce GC pressure while preserving logic.
