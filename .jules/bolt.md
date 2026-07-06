
## 2023-10-25 - Prevent GC pressure in 60 FPS paths
**Learning:** In high-frequency hot paths like the `MovementSystem.ts` update loop or the `EntityRenderer.ts` render loop, `Array.prototype.forEach` creates closure allocations and generates measurable GC pressure, leading to frame drops. Manual iteration with a simple index-based `for` loop is necessary.
**Action:** Replace `forEach` with standard `for` loops containing bounds-checking and array element guards (`if (item === undefined) continue;`) across the codebase's physical updates and rendering passes.
