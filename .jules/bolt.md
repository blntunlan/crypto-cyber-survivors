## 2024-05-24 - [Canvas Batch Rendering]
**Learning:** Grouping identical `arc` calls into a single `beginPath`/`fill` cycle significantly reduces overhead. Crucially, `ctx.moveTo(x + r, y)` is required before `ctx.arc(x, y, r, ...)` to prevent connecting lines between disjoint circles in the same path.
**Action:** Always batch simple geometric primitives (like standard game entities) by color/style when rendering 100+ instances.
