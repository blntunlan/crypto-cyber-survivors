## 2026-05-28 - Optimize EntityRenderer hot loops
**Learning:** High-frequency render paths in `EntityRenderer.ts` (like 60 FPS update loops rendering hundreds of entities) suffer from Array.prototype.forEach overhead.
**Action:** Replace `Array.prototype.forEach` with standard `for (let i = 0, len = arr.length; i < len; i++)` loops to avoid closure function allocations and GC pressure, as outlined in Bolt's directives. Ensure `return` within callbacks is correctly translated to `continue`.
