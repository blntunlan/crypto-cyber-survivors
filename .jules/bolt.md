

## 2024-05-15 - [Viewport Bounds Allocation Optimization]
**Learning:** Frequent creation of `ViewportBounds` objects using `createViewportBounds` inside 60FPS render loops and system update loops causes unnecessary garbage collection (GC) pressure, which can lead to micro-stutters.
**Action:** Use a pre-allocated class property `ViewportBounds` and mutate it in-place using `updateViewportBounds` taking advantage of object reuse in hot paths.

## 2024-05-15 - [CI Fixes & Global Fetch Interception]
**Learning:** Global fetch interception in a module loaded across tests (like `ErrorTracker.ts`) can interfere with Vitest's internal worker communication RPC leading to `[vitest-worker]: Closing rpc while "fetch" was pending` errors.
**Action:** Guard fetch interceptors with `import.meta.env.MODE === 'test'` checks and only enable them inside specific tests using custom test flags like `window.__ALLOW_FETCH_INTERCEPTION_FOR_TESTS__`.
