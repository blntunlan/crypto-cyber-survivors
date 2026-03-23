## 2024-03-23 - Avoid closure allocations in 60FPS update loops
**Learning:** Using `Array.prototype.forEach` inside hot physics and movement loops (like 60 FPS `update()` functions) causes closures to be allocated repeatedly, driving up memory usage and increasing Garbage Collection (GC) pressure.
**Action:** Always replace `forEach` calls in core update loops (such as `CollectionSystem.ts` and `MovementSystem.ts`) with standard zero-allocation `for` loops (e.g., `for (let i = 0, len = arr.length; i < len; i++)`) to stabilize frame rates.
