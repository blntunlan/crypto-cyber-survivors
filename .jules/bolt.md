## 2024-05-23 - SpatialGrid Precision vs Performance
**Learning:** In `SpatialGrid`, replacing `Math.floor(coordinate / cellSize)` with multiplication by an inverse (`coordinate * (1/cellSize)`) introduces floating-point precision errors at cell boundaries (e.g., `1.999...` vs `2`), potentially breaking collision detection correctness. The performance gain (~2%) is not worth the correctness risk.
**Action:** Stick to division for coordinate mapping unless an epsilon strategy is rigorously implemented. Use bitwise hoisting for safe optimization.
