## 2024-03-24 - Zero Allocation Loop Patterns
**Learning:** In high-frequency physics/renderer loops (60FPS), `Array.prototype.forEach` creates closure allocations that put pressure on the Garbage Collector and cause frame drops.
**Action:** Replace `forEach` with standard `for` loops in hot paths like `MovementSystem.ts` arrays (`activeParticles`, `activeFloatingTexts`, `activeEnemies`, `activeSpeedLines`, `activeImpactRings`). Remember to replace `return;` inside the callback with `continue;` in the `for` loop.
