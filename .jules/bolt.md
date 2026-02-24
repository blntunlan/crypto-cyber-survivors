## 2024-05-23 - Manual Loop Unrolling in V8
**Learning:** Manually unrolling a 3x3 grid loop in `SpatialGrid.forEachNearby` resulted in a performance regression (3.7ms -> 13.8ms) compared to a standard nested loop, likely due to increased function size preventing inlining or instruction cache pressure.
**Action:** Prefer compact, well-structured loops over manual unrolling in V8 unless profiling explicitly indicates loop overhead is the bottleneck. Hoisting invariant calculations (like bitwise shifts) out of the inner loop is still effective.
