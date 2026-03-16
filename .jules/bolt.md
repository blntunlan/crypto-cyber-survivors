## 2024-05-18 - [ViewportBounds GC Optimization]
**Learning:** Recreating `ViewportBounds` objects per-frame via `createViewportBounds` in the hot render/combat loops causes significant garbage collection overhead, especially when multiplied by high entity and projectile counts.
**Action:** Always prefer pre-allocating state objects and updating them in-place via an `updateX` method during hot 60FPS loops to reduce GC pressure.
