## $(date +%Y-%m-%d) - Optimize loop paths
**Learning:** High-frequency loop paths (e.g., 60 FPS update loops in physics systems like MovementSystem.ts) often rely on Array.prototype.forEach, which allocates closure functions on every frame, generating significant GC pressure.
**Action:** Replace Array.prototype.forEach with standard `for (let i = 0, len = arr.length; i < len; i++)` loops in hot loops like `MovementSystem.ts` update routines to eliminate per-frame closure allocations and improve stable FPS.
