## 2024-05-19 - SpatialGrid Performance Optimization
**Learning:** In highly dynamic systems, entirely clearing an internal `Map` and reconstructing it every frame generates large garbage collection and reallocation overhead, even when object pooling the map values.
**Action:** When a game spatial grid's entities mostly stay around the same clusters frame to frame, iterating through the map and resetting active array cell lengths to `0` while only deleting entirely empty cell map keys is significantly faster and prevents unbounded map growth.
