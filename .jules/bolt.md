## 2024-05-24 - Optimization: Object allocation in iterators
**Learning:** In a hot path like `CombatSystem.ts`'s `findNearestEnemy`, allocating a closure or using a local object literal in `forEachInRange` creates garbage collection pressure every frame, causing micro-stutters.
**Action:** Extract the iteration context into a static, flat object (e.g. `TARGETING_CONTEXT`) and use `forEachInRangeWithContext` combined with a pre-defined static callback to eliminate object allocation inside the main game loop.
