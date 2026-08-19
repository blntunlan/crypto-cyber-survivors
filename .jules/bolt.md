## 2026-08-19 - Zero-Allocation Physics Updates
**Learning:** The physics update loops in MovementSystem.ts and CombatResolutionService.ts were allocating closure functions per frame via `.forEach`, causing GC pressure in high-entity scenarios.
**Action:** Convert `.forEach` loops over entity pools to standard `for` loops with sparsity checks (`if (e === undefined) continue;`) to maintain zero-allocation execution paths.
