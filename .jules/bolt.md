
## 2024-10-15 - Eliminate Closure Allocations in Hot Paths
**Learning:** Extracting state into a static context object (`TARGETING_CONTEXT`) allows using static callbacks (`targetingCallback`) instead of dynamically allocated closures for frequent iterators (like `forEachInRange`). This avoids significant GC overhead.
**Action:** Always prefer context-aware iteration methods (like `forEachInRangeWithContext`) alongside static context objects when querying spatial grids or executing hot loops.

## 2024-10-15 - Reviewer Hallucination on Existing Methods
**Learning:** The simulated code reviewer might hallucinate that an invoked method does not exist in the codebase, even when it is explicitly defined and verified by the typechecker (e.g., `forEachInRangeWithContext` in `SpatialGrid`).
**Action:** Do not blindly revert your implementation based on reviewer hallucinations. Always explicitly verify the existence of the method using `grep` or `cat` first, and rely on `npm run typecheck` or `npm run test` as the ultimate source of truth for structural integrity.
