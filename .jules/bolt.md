## 2024-03-24 - [Hoist Bitwise Operations in Spatial Grid]
**Learning:** In hot loops like `SpatialGrid.forEachInRange`, bitwise shift operations `<<` applied to outer loop variables inside inner loops cause redundant computation. V8 does not always optimize this automatically.
**Action:** Always hoist calculations that depend solely on outer loop variables out of the inner loop to save cycles.
