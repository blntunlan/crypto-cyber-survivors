## 2023-08-06 - Loop Optimization
**Learning:** Replaced `Array.prototype.forEach` with zero-allocation `for` loops in hot paths like `EntityRenderer` and `MovementSystem` to reduce GC pressure and function invocation overhead.
**Action:** Always prefer `for` loops with array length caching in 60fps loops over functional iterators when optimizing game engines.
