## 2025-05-15 - SpatialGrid Hybrid Clearing Strategy
**Learning:** Using a naive array clearing strategy in an active spatial grid (where entities constantly move) can lead to unbounded map growth, increasing GC pressure over time due to unused cells retaining keys and empty arrays.
**Action:** Implement a hybrid clearing strategy for SpatialGrid instances. Reuse active cells by resetting length (`.length = 0`), and for inactive cells (`.length === 0`), return their arrays to the pool and delete their keys from the map.
