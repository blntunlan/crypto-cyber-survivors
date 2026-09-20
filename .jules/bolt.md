## 2024-11-06 - Replace .forEach with for loop for performance
**Learning:** `forEach` inside hot paths like an update loop in games allocates closures causing a high GC overhead.
**Action:** Replace `forEach` with standard `for` loops caching the array length using `for (let i = 0, len = arr.length; i < len; i++)` in those situations.
