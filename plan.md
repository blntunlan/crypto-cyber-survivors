1. **Explore `MovementSystem.ts` and `EntityRenderer.ts`:**
   - There are several array `.forEach` calls in these files (e.g., `pool.activeEnemies.forEach(...)`, `pool.activeParticles.forEach(...)`, `pool.activeFloatingTexts.forEach(...)`, `pool.activeGems.forEach(...)`).
   - These are high-frequency hot loops (running every frame at 60fps) and using `.forEach` allocates a closure, which can cause GC pressure.
   - We will replace these `.forEach` calls with standard `for` loops.

2. **Replace `.forEach` with `for` loops in `MovementSystem.ts`:**
   - `updateEnemies`: `pool.activeEnemies.forEach(...)` -> `for (let i = 0, len = pool.activeEnemies.length; i < len; i++) { ... }`
   - `updateSpeedLines`: `pool.activeSpeedLines.forEach(...)` -> `for (...)`
   - `updateImpactRings`: `pool.activeImpactRings.forEach(...)` -> `for (...)`
   - `updateParticles`: `pool.activeParticles.forEach(...)` -> `for (...)`
   - `updateFloatingTexts`: `pool.activeFloatingTexts.forEach(...)` -> `for (...)`
   - `updateDyingEnemies`: `pool.activeEnemies.forEach(...)` -> `for (...)`

3. **Replace `.forEach` with `for` loops in `EntityRenderer.ts`:**
   - `drawGems`: `pool.activeGems.forEach(...)` -> `for (...)`
   - `drawBuffGems`: `buffGems.forEach(...)` -> `for (...)`
   - `drawEnemies`: `pool.activeEnemies.forEach(...)` -> `for (...)`
   - `drawPlayer`: `state.dashTrail.forEach(...)` -> `for (...)`

4. **Verify the logic:**
   - Ensure that `return` statements within the `.forEach` closures are correctly translated to `continue` statements in the `for` loops.
   - Guard against sparse array elements by adding `if (item === undefined) continue;`.

5. **Complete pre-commit steps:**
   - Run typechecking, linting, and tests to ensure no regressions were introduced.

6. **Create PR:**
   - Formulate PR description detailing the optimizations, impact on GC pressure and performance, and ensuring no functionality change.
