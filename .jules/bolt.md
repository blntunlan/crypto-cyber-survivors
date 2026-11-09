## 2026-09-02 - Closure allocations in targeting systems
**Learning:** `enemyGrid.forEachInRange` allocates anonymous closure functions dynamically every frame inside targeting methods (`findNearestEnemy` in `CombatSystem.ts` and `WeaponFiringPipeline.ts`), causing continuous GC pressure which creates frame hitches.
**Action:** Use `enemyGrid.forEachInRangeWithContext` along with a pre-allocated static context object (e.g., `TARGETING_CONTEXT`) to execute searches with zero allocation overhead.
