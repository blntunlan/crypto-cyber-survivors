## 2026-09-30 - [Zero-Allocation Iteration in Targeting Loops]
**Learning:** High-frequency path loops like `forEachInRange` in game loops cause heavy closure allocations leading to garbage collection pauses if anonymous functions are used.
**Action:** Use context-aware variants like `forEachInRangeWithContext` alongside a statically pre-allocated context object (e.g. `TARGETING_CONTEXT`) to maintain state without dynamic closures.
