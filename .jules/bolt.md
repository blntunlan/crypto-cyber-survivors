## 2026-08-01 - Array.forEach Allocation Overhead
**Learning:** Using Array.prototype.forEach in high-frequency loops (like physics 60 FPS updates) creates closure allocations and increases GC pressure, causing stutter.
**Action:** Always replace .forEach with standard 'for' loops (and guards against undefined elements) in core loop paths to avoid closure allocations.
