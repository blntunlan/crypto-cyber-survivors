## 2024-05-18 - [Optimization] Replace .forEach with for loops in hot paths
**Learning:** Found several `.forEach` loop usages in hot paths (update loops and render loops), specifically in `MovementSystem.ts` and `EntityRenderer.ts`. In hot loops (e.g. 60 FPS update loops), using `.forEach` leads to closure function allocations and GC pressure.
**Action:** Replace `Array.prototype.forEach` with standard `for` loops in hot path functions. Guard against sparse arrays by checking if the element is undefined, which is a common pattern in Object Pooling implementations in this codebase.
