## 2026-10-20 - Optimize array iteration in hot loops
**Learning:** Using `Array.prototype.forEach` inside hot game loops (e.g., rendering, movement systems, combat resolution) triggers per-element anonymous function closure allocations. This puts significant pressure on the garbage collector resulting in dropped frames.
**Action:** Always replace `.forEach` with standard `for (let i = 0, len = arr.length; i < len; i++)` loops and use `if (!element) continue;` for guard clauses against sparse arrays when operating within high-frequency update loops.
