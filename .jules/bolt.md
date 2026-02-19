## 2026-02-13 - Canvas Batching Optimizations
**Learning:** When batching `arc` calls into a single path for performance, `ctx.moveTo(x + radius, y)` must be called before `ctx.arc()` to prevent rendering connecting lines between the circles.
**Action:** Always include `moveTo` when creating disjoint sub-paths within a single `beginPath`/`stroke/fill` cycle.

## 2026-02-13 - Mocking Canvas Context
**Learning:** When mocking `CanvasRenderingContext2D` to test batched path rendering, the mock must explicitly include `moveTo` (via `vi.fn()`) because batching logic often uses it to create disjoint sub-paths within a single draw call.
**Action:** Update test mocks to include `moveTo` when testing batched rendering.
