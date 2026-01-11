# Bolt's Performance Journal ⚡

> Only critical learnings that will help avoid mistakes or make better decisions.

---

## 2024-05-23 - Canvas State Management
**Learning:** `ctx.save()` and `ctx.restore()` have significant overhead in tight render loops (e.g., thousands of entities/bullets).
**Action:** Prefer calculating absolute coordinates (e.g., `x - size/2`) over using `ctx.translate(x, y)` for simple shapes, especially when rotation or scaling is not required.
