## 2026-07-10 - Optimize loop iteration in hot paths
**Learning:** Replacing `Array.prototype.forEach` with standard `for` loops in high-frequency update loops (like physics systems) eliminates closure function allocations and reduces GC pressure.
**Action:** Use standard `for` loops in 60 FPS update paths.
