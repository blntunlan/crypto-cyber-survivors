
## 2025-03-07 - [SpatialGrid Map Clearing Strategy]
**Learning:** In a `SpatialGrid` map that updates every frame, completely clearing the map (`map.clear()`) and recreating entries is slow. However, keeping all keys and just clearing the arrays can lead to unbounded map growth if entities move randomly or sparsely, resulting in slower iteration.
**Action:** Use a hybrid approach where active cells (`.length > 0`) simply have their arrays emptied (`.length = 0`), and empty cells (`.length === 0` from the previous frame) are pushed back to an array pool and their key is deleted (`map.delete(key)`). This provides a balanced speedup without allowing the map to grow continuously over time.
