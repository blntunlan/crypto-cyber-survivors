# Bolt's Performance Journal ⚡

> Only critical learnings that will help avoid mistakes or make better decisions.

---

## 2024-05-24 - Canvas Rendering Batching & Optimization
**Learning:** In high-frequency Canvas render loops (60FPS), minimizing `ctx.save()`/`ctx.restore()` calls and state changes (like `fillStyle`) is critical. Batching identical draw calls (like gems of the same color) significantly reduces overhead.
**Action:** When optimizing renderers, look for opportunities to group entities by visual style (color, shadow) and batch their geometry into a single path, and replace `ctx.translate()` with absolute coordinates for entities that don't require complex local transformations (rotation/scale).
