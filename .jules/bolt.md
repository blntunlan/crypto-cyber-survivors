## 2024-05-19 - Replace forEach with for loops in hot paths
**Learning:** Zero-allocation patterns in high-frequency paths (like `MovementSystem.ts` and `EntityRenderer.ts`) require manual for-loop unrolling instead of `Array.prototype.forEach` to reduce GC pressure on 60FPS tick paths.
**Action:** Always use standard `for` loops (with sparse array guards like `if (item === undefined) continue;`) instead of `forEach` when iterating over object pools in update or render loops that run every frame.
