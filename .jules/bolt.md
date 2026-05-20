
## 2023-10-27 - [ViewportBounds Allocation Optimization]
**Learning:** Returning fresh objects from utility functions (like `createViewportBounds`) called within hot rendering loops (`EntityRenderer`, `ProjectileRenderer`, `EffectRenderer`, `CombatSystem`) triggers heavy garbage collection overhead due to per-frame memory allocation.
**Action:** Always prefer caching generic object instances (`ViewportBounds`) and mutating them in-place with a dedicated update function (`updateViewportBounds`) to avoid recurring object creation, reducing GC pauses and maintaining a stable 60FPS framerate.
