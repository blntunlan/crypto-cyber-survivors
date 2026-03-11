

## 2024-05-15 - [Viewport Bounds Allocation Optimization]
**Learning:** Frequent creation of `ViewportBounds` objects using `createViewportBounds` inside 60FPS render loops and system update loops causes unnecessary garbage collection (GC) pressure, which can lead to micro-stutters.
**Action:** Use a pre-allocated class property `ViewportBounds` and mutate it in-place using `updateViewportBounds` taking advantage of object reuse in hot paths.
