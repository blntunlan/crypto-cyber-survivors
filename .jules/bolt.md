## 2025-02-18 - Avoid closure allocations in hot paths
**Learning:** High-frequency game loops (e.g., 60fps render and physics updates) iterating over large arrays using `.forEach` allocate anonymous closure functions every frame, causing significant GC pressure and stuttering.
**Action:** Replace `.forEach` with standard `for` loops in systems like `MovementSystem` and `EntityRenderer`. Ensure `return` statements from the callbacks are translated to `continue`, and include an explicit undefined guard for sparse arrays.
