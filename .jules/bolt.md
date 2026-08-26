## 2024-08-26 - [Canvas Renderer .forEach Allocation]
**Learning:** High-frequency rendering loops running at 60 FPS were triggering garbage collection (GC) due to `Array.prototype.forEach` creating closure allocations inside `BackgroundRenderer`, `EffectRenderer`, and `EntityRenderer`.
**Action:** Always replace `.forEach` with a standard `for` loop in high-frequency rendering methods to prevent closure allocations and reduce GC pressure per frame, mapping early `return` to `continue`.
