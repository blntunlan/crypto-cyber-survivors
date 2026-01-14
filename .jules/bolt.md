# Bolt's Performance Journal ⚡

> Only critical learnings that will help avoid mistakes or make better decisions.

---

## 2025-01-20 - [SpatialGrid Spread Syntax Bottleneck]
**Learning:** In high-frequency hot paths (like game loops checking collision 60fps), `array.push(...items)` using spread syntax is significantly slower (~15%) than a manual `for` loop due to iterator overhead and stack usage.
**Action:** Prefer manual loops or direct array manipulation for hot-path array merging.
