
## 2024-05-24 - [Avoid closure allocations in hot loops]
**Learning:** In high-frequency loop paths (e.g., 60 FPS update loops in physics systems like MovementSystem.ts), Array.prototype.forEach creates closure function allocations and GC pressure. Standard for loops with guard clauses are better.
**Action:** Replace Array.prototype.forEach with standard for loops in high-frequency paths. Always include a guard clause (e.g., `if (entity === undefined) continue;`) to prevent runtime TypeErrors from sparse arrays or concurrently modified pools. Ensure `return` statements are changed to `continue`.
