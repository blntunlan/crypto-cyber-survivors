## 2024-07-28 - Optimizing high-frequency loops
**Learning:** Array.prototype.forEach causes performance bottlenecks in high-frequency loop paths (like 60 FPS update loops) due to garbage collection pressure from closure function allocations.
**Action:** Replace Array.prototype.forEach with standard for loops (e.g. `for (let i = 0, len = arr.length; i < len; i++)`) in all such paths. When converting, ensure return statements within the forEach callback are translated to continue, and add guard clauses to handle sparse arrays.
