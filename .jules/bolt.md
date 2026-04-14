## 2025-04-14 - Game Loop Memory Optimization
**Learning:** In high-frequency 60 FPS update loops (like `MovementSystem`, `CollectionSystem`, `CombatResolutionService`), `Array.prototype.forEach` allocates closures repeatedly, causing high GC pressure.
**Action:** Always replace `forEach` with standard `for (let i = 0, len = arr.length; i < len; i++)` loops in hot code paths, ensuring `return` statements are correctly changed to `continue` and guard clauses for `undefined` are added to prevent crashes.
