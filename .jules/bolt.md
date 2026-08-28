## 2024-05-19 - EntityRenderer Array.prototype.forEach Allocations
**Learning:** Calling Array.prototype.forEach with inline arrow functions inside a rendering loop (like 60 FPS requestAnimationFrame loops in EntityRenderer.ts and BackgroundRenderer.ts) triggers function allocations on every frame. Over time, these allocations cause garbage collection pauses that result in dropped frames (jank).
**Action:** Replace `.forEach()` calls on active pools (e.g. `pool.activeEnemies`, `pool.activeGems`) with standard `for (let i = 0, len = arr.length; i < len; i++)` loops in hot render paths.
