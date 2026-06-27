## 2024-03-24 - Zero-Allocation in High-Frequency Paths
**Learning:** Using `Array.prototype.forEach` inside hot loops like `MovementSystem.ts` (called every frame) causes unnecessary closure allocations and increases GC pressure.
**Action:** Replace `forEach` with standard `for (let i = 0, len = arr.length; i < len; i++)` loops in high-frequency update loops. Ensure to guard against undefined objects in pools (`if (entity === undefined) continue;`).
