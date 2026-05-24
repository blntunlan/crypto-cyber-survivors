## 2026-05-24 - [Avoid using `forEach` in high frequency loop]
**Learning:** Avoid using `Array.prototype.forEach` in high-frequency update loops because it creates closure allocations for each iteration and per tick resulting in garbage collection overhead.
**Action:** Replace them with standard `for (let i = 0, len = arr.length; i < len; i++)` loops to avoid the closure overhead.
