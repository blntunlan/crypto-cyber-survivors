## 2025-03-09 - Replace forEach with standard for loops in rendering systems
**Learning:** In high-frequency loop paths (e.g., 60 FPS update loops in rendering systems like EntityRenderer.ts), using Array.prototype.forEach causes closure function allocations and GC pressure. Converting these to standard `for` loops helps prevent these closure allocations.
**Action:** When converting Array.prototype.forEach in rendering and high-frequency systems, ensure return statements within the forEach callback are correctly translated to `continue` to preserve flow logic.
