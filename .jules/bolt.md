## 2024-04-08 - Avoid Intermediate Object Allocations in Hot Loops
**Learning:** In high-frequency functions (like `findNearestEnemy` in spatial queries called every frame), allocating candidate objects (e.g., `{ x, y, distSq, speed }`) within iterative loops causes unnecessary GC pressure and can trigger minor garbage collection pauses that impact FPS.
**Action:** Use primitive variables (like `let bestEnemy = null; let bestDistSq = Infinity;`) to track references and compute the final structured result object *only once* after the loop finishes.
