## 2025-04-22 - Optimize Find Nearest Enemy Combat Queries
**Learning:** During high-frequency hot loops like spatial queries inside `CombatSystem`, continually allocating intermediate object representations (`{ x: number, y: number, distSq: number, speed: number }`) creates unnecessary garbage collection pressure and can impact game performance over time.
**Action:** Replace intermediate object allocations with primitive local variables inside loop paths, instantiating the result object only at the end. Keep simple loop states primitive.
