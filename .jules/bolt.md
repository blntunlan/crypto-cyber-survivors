## 2024-07-16 - Replace forEach with for loops
**Learning:** In high-frequency loop paths (e.g., 60 FPS update loops in physics systems like MovementSystem.ts), Array.prototype.forEach causes closure function allocations and GC pressure.
**Action:** Replace Array.prototype.forEach with standard for loops to avoid closure function allocations and GC pressure.
