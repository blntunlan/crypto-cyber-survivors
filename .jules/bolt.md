## 2026-05-16 - Pre-allocating ViewportBounds Objects
**Learning:** The CullingUtils `createViewportBounds` utility was creating a new `ViewportBounds` object every frame for each active renderer (Entity, Effect, Projectile) and the `CombatSystem` (when scanning nearby enemies). This generated massive garbage collection pressure.
**Action:** Replaced per-frame allocation with class-level pre-allocated `ViewportBounds` properties. Created an `updateViewportBounds` utility to mutate bounds in-place. Always use in-place mutation for transient mathematical objects in 60fps render loops.
