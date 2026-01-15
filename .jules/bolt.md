# Bolt's Performance Journal ⚡

> Only critical learnings that will help avoid mistakes or make better decisions.

---

## 2025-02-19 - Canvas Draw Batching
**Learning:** Batching `ctx.stroke()` calls for disjoint paths (like a grid) significantly reduces the number of draw calls without visual changes.
**Action:** When drawing multiple lines/shapes with the same style, use a single `beginPath`/`stroke` pair and multiple `moveTo`/`lineTo` calls instead of stroking each one individually.
