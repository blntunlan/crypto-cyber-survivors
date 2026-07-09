## 2025-02-16 - Replace forEach with standard for-loops in physics and render paths
**Learning:** In high-frequency 60fps loops (e.g., `MovementSystem`, `EntityRenderer`) where we iterate over `pool.active*` arrays, `Array.prototype.forEach` causes an inline closure function allocation on every frame, which significantly increases garbage collection (GC) pressure and micro-stutters over time.
**Action:** Always prefer standard `for (let i = 0, len = arr.length; i < len; i++)` loops over `forEach` in any high-frequency physics or rendering update loop.
