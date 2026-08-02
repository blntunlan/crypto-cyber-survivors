## 2026-08-02 - Array.prototype.forEach Closure Allocations
**Learning:** In high-frequency 60 FPS update paths (like physics and rendering loops), using Array.prototype.forEach allocates closures causing continuous GC pressure which leads to micro-stutters.
**Action:** Always replace .forEach with standard for loops with array bounds caching (let i = 0, len = arr.length; i < len; i++) in the core engine tick to preserve zero-allocation constraints.
