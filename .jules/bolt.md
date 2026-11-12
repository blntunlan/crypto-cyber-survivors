## 2024-05-19 - [Performance Optimization: Renderer Loop Conversions]
**Learning:** Found multiple usages of Array.prototype.forEach inside the rendering loop (BackgroundRenderer, EntityRenderer, EffectRenderer). Replacing forEach with standard for-loops caching array lengths eliminates closure allocation in the most performance-critical path.
**Action:** Use standard for-loops with indexed access and boundary checks across hot render loops to increase rendering frame rate.
