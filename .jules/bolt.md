## 2026-03-29 - Array.prototype.forEach Closure Bottleneck
**Learning:** The use of Array.prototype.forEach inside the 60FPS EntityRenderer loop creates continuous closure allocations causing measurable garbage collection pressure. This codebase's rendering architecture mandates using standard unrolled for-loops instead of functional iterators.
**Action:** When working on rendering or high-frequency systems, always verify iteration mechanisms and replace Array.prototype.forEach with traditional for-loops while translating returns to continues.
