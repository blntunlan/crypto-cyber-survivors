## 2024-03-04 - Reused ViewportBounds object to reduce GC pressure
**Learning:** In high-frequency rendering systems (like `CombatSystem`, `EntityRenderer`, `ProjectileRenderer`, and `EffectRenderer`), creating a new `ViewportBounds` object every frame using `createViewportBounds()` causes unnecessary garbage collection overhead.
**Action:** Implemented `updateViewportBounds` to modify a pre-allocated `ViewportBounds` instance in place, preventing new object allocations in the hot render path.
