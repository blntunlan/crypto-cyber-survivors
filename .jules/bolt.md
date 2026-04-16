
## 2024-04-16 - Hot Path Object Allocation
**Learning:** In hot loops like `findNearestEnemy` (called every frame for every active weapon), allocating intermediate objects inside the loop (e.g. `{ x, y, distSq, speed }`) creates significant garbage collection pressure.
**Action:** Unpack intermediate state into primitive local variables (like `bestX`, `bestY`, `bestDistSq`, `bestSpeed`) and only allocate the final result object right before returning it.
