## 2024-05-22 - SpatialGrid Coordinate Optimization
**Learning:** `Math.floor(coordinate * invCellSize)` is preferred over `Math.floor(coordinate / cellSize)` in hot loops to avoid division overhead. Hoisting bitwise shift operations (`(cellX + dx) << 16`) out of inner loops reduces redundant arithmetic.
**Action:** Apply similar optimizations to other grid-based systems or hot loops involving coordinate transformation.

## 2024-05-22 - Dependency Management
**Learning:** Running `npm install` can regenerate `package-lock.json` with significant noise if the environment differs.
**Action:** Always verify `package-lock.json` is not included in the commit unless intended. Use `npm ci` or revert the file if no dependencies were added.
