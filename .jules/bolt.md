## 2024-05-04 - MovementSystem loop optimization
**Learning:** In high-frequency physics systems, `Array.prototype.forEach` allocates closure functions per frame which increases GC pressure.
**Action:** Replace `forEach` with standard `for (let i = 0, len = arr.length; i < len; i++)` loops and add `if (item === undefined) continue;` guards to handle sparse arrays gracefully.
