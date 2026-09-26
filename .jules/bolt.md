## 2024-09-26 - Optimized Iterators in MovementSystem
**Learning:** Replaced Array.prototype.forEach with standard for loops in high-frequency update loops (MovementSystem.ts) to eliminate closure allocations and reduce garbage collection pressure.
**Action:** Always prefer standard for loops over forEach in hot paths (like system updates) to minimize GC overhead.
