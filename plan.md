1. **Optimize `CombatResolutionService.triggerShockwave`**
   - In `services/combat/physics/CombatResolutionService.ts`, the `triggerShockwave` method uses `pool.activeEnemies.forEach(...)` to iterate over enemies.
   - We will replace `Array.prototype.forEach` with a standard `for` loop `for (let i = 0, len = pool.activeEnemies.length; i < len; i++) { ... }` to avoid closure allocation and reduce garbage collection pressure.
   - Ensure to add an `if (enemy === undefined) continue;` check as per the Memory safety guidelines.
2. **Optimize `CollectionSystem.handleGemCollections`**
   - In `services/combat/physics/CollectionSystem.ts`, `handleGemCollections` uses `pool.activeGems.forEach(...)`.
   - We will convert this to a `for` loop, ensuring `return` statements in the callback become `continue` statements.
   - Add the sparse array guard: `if (gem === undefined) continue;`.
3. **Optimize `MovementSystem.updateEnemies`**
   - In `services/combat/physics/MovementSystem.ts`, `updateEnemies` uses `pool.activeEnemies.forEach(...)`.
   - Convert to a `for` loop with a sparse array check.
4. **Optimize other loop updates in `MovementSystem`**
   - Also in `MovementSystem.ts`, convert the `forEach` loops in `updateSpeedLines`, `updateImpactRings`, `updateParticles`, `updateFloatingTexts`, and `updateDyingEnemies` to `for` loops.
   - Add sparse array checks to all.
5. **Run tests & verification**
   - Run `pnpm run lint` and `pnpm run test` to verify.
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
6. **Submit PR**
   - Submit the PR with the required Bolt PR format.
