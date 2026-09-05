## 2024-05-18 - Optimized MovementSystem loops to reduce GC pressure
**Learning:** Found multiple instances of `Array.prototype.forEach` being used inside hot simulation loops (like `updateParticles`, `updateFloatingTexts`, `updateDyingEnemies`, etc. in `MovementSystem.ts` and rendering passes). In a game striving for 60 FPS, these create closures that allocate and subsequently pressure the GC.
**Action:** Convert them to standard `for` loops (using array length caching and guard clauses for undefined values) to reduce overhead.
