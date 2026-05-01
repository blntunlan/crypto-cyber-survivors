
## 2025-02-20 - [Zero-Allocation Update Loops]
**Learning:** High-frequency loop paths (e.g., `MovementSystem.ts` update cycles running 60 times a second) should avoid `Array.prototype.forEach` to prevent continuous closure function allocations, which cause unnecessary GC pressure and can degrade performance over time.
**Action:** Replace `forEach` with standard zero-allocation `for` loops (`for (let i = 0, len = arr.length; i < len; i++)`) in hot paths like physics updates, rendering, or game state ticks. Remember to include bounds checks (`if (entity === undefined) continue;`) to safely handle potential array holes.
