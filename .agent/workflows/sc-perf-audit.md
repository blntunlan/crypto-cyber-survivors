---
description: SCALABILITY DISCIPLINE - Performance & GC-Free Audit
---

Run this workflow whenever modifying the Game Loop or Core Services.

## 1. GC-Free Loop Inspection
Scan `GameEngine.tsx`, `renderers/`, and `physics/` for memory allocation:
- Check for `new` keyword (except for `SpatialGrid` initialization).
- Check for Array methods creating new arrays: `.map()`, `.filter()`, `.slice()`.
- Check for object literals inside the loop: `{ x, y }`.
- Check for string templates or concatenations: `` `${val}` ``.

## 2. Object Pooling Check
Confirm that all spawned entities use `PoolManager`:
- Search for `new Bullet()`, `new Particle()`, `new Enemy()`.
- **FIX**: Replace with `PoolManager.spawn(...)`.

## 3. O(N²) Detection
- Search for nested loops iterating over entity arrays.
- **FIX**: Ensure they use `SpatialGrid.query(...)` for collision or proximity logic.

## 4. Verification
// turbo
1. Run `npm run lint`.
// turbo
2. Run `npm run build` to ensure no production bundle issues.
3. Check FPS in dev mode using the HUD to ensure 60FPS stability.

---
*Reference: docs/SCALABILITY_DISCIPLINE.md Section 1*
