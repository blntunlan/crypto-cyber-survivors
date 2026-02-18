## 2024-05-23 - SpatialGrid Precision vs Performance
**Learning:** In `SpatialGrid`, replacing `Math.floor(coordinate / cellSize)` with multiplication by an inverse (`coordinate * (1/cellSize)`) introduces floating-point precision errors at cell boundaries (e.g., `1.999...` vs `2`), potentially breaking collision detection correctness. The performance gain (~2%) is not worth the correctness risk.
**Action:** Stick to division for coordinate mapping unless an epsilon strategy is rigorously implemented. Use bitwise hoisting for safe optimization.

## 2024-05-23 - Circular Dependency in Logger
**Learning:** `services/supabase/client.ts` cannot import `Logger` because `Logger` might indirectly depend on `client.ts` (or files that import it), causing a circular dependency where `Logger` is undefined during module evaluation. This leads to `TypeError: Logger.warn is not a function`.
**Action:** Use `console.warn`/`console.log` directly in low-level infrastructure files like `client.ts` for initialization checks, or ensure `Logger` is lazily accessed.

## 2024-05-23 - Testing Supabase Proxy
**Learning:** The `supabase` export in `services/supabase/client.ts` is a proxy object that is never `null`. Tests verifying configuration status should check specific properties (e.g., `expect(supabase.auth).toBeUndefined()`) rather than nullability.
**Action:** Update tests to inspect properties of the proxy rather than the proxy itself.
