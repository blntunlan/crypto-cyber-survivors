## 2025-02-23 - Avoid Array.forEach in Hot Game Loops
**Learning:** In high-frequency game engine loops (e.g. 60 FPS `update()` ticks looping over hundreds of entities), `Array.prototype.forEach` creates significant overhead due to continual closure function allocation and consequent garbage collection pressure.
**Action:** Always replace `.forEach` with standard `for (let i = 0, len = pool.length; i < len; i++)` in any hot physics or rendering path. Ensure sparse arrays are guarded using `if (entity === undefined) continue;` to prevent runtime crashes.
