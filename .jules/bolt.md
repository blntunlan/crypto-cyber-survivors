## 2024-05-23 - [SpatialGrid Division Optimization]
**Learning:** `Math.floor` behaves consistently with multiplication by inverse for positive `cellSize` and typical coordinate ranges, allowing replacement of expensive division in hot loops. `SpatialGrid` uses coordinate packing which is sensitive to integer conversion, but `Math.floor` correctness is preserved.
**Action:** Always check for division in hot loops (like spatial hashing) and replace with multiplication by cached inverse if the divisor is constant.
