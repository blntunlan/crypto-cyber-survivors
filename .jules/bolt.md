## 2024-05-24 - Zero-Allocation Iteration Pattern
**Learning:** In high-frequency loop paths (like 60 FPS physics systems), `Array.prototype.forEach` causes excessive garbage collection pressure due to callback function allocation. Standard `for` loops are strictly required.
**Action:** Always replace `.forEach` with `for` loops in hot paths, ensuring `return` statements are correctly translated to `continue` and sparse array guards (`if (item === undefined) continue;`) are implemented.
