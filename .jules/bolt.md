## 2026-04-11 - Replaced forEach with standard for loops in high-frequency update loop
**Learning:** In high-frequency game engine update methods, `Array.prototype.forEach` callback allocations introduce unnecessary garbage collection pressure and latency overhead, especially at 60 FPS.
**Action:** Replace `forEach` with standard `for (let i = 0, len = arr.length; i < len; i++)` loops for processing large active entity arrays (`enemies`, `bullets`, `particles`, etc.) within physics and rendering systems to prevent frame drops caused by GC pauses.
