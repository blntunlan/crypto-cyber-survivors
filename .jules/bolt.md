## 2025-05-20 - Hybrid Clearing in SpatialGrid
**Learning:** Fully clearing and repopulating a `Map` every frame (even if pooling arrays) can be slower than retaining map entries and mutating their contents if the set of active cells is relatively stable. However, never deleting entries causes the map to grow unbounded.
**Action:** Use a hybrid approach in high-frequency frame loops: reuse arrays for active map cells (`length = 0`), and only `delete` map keys and return arrays to a pool for cells that were empty in the previous frame (`length === 0`).
