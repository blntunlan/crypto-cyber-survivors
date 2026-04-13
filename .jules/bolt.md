## 2024-05-15 - Micro-Optimization in V8 Hot Loops
**Learning:** V8 engine handles object allocations well, but inside extremely tight hot loops (like spatial grid nearest neighbor queries in `CombatSystem`), repeatedly allocating and immediately discarding `{ x, y, distSq, speed }` candidate objects for every target check creates measurable GC pressure over time.
**Action:** Use primitive local variables (`bestX`, `bestY`, `bestDistSq`, `bestSpeed`) to track the best candidate state inside the loop, and only allocate the single final result object after the loop concludes.
