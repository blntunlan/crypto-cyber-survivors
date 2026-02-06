## 2024-05-24 - Canvas Arc Batching
**Learning:** `ctx.arc()` connects the previous point to the start of the arc with a line if a path is already open. When batching disjoint circles in a single path, `ctx.moveTo(x + r, y)` is required before `ctx.arc(x, y, r, 0, PI*2)` to prevent these connecting lines.
**Action:** Always include `moveTo` to the start of the arc (taking radius into account) when batching circular primitives in Canvas 2D.
